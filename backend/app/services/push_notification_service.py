"""
PushNotificationService — sends mobile push notifications via:
  1. Expo Push API  (primary — works for iOS & Android through Expo Go / standalone builds)
  2. FCM v1 HTTP API (secondary — native Android if not using Expo)

Both are fire-and-forget; failures are logged but never raise so the caller always succeeds.
"""

import asyncio
import json
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_token import DevicePushToken
from app.models.alert import Alert, NotificationEvent
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Expo Push Notification API
# Docs: https://docs.expo.dev/push-notifications/sending-notifications/
# ---------------------------------------------------------------------------
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"

# FCM v1 endpoint — replace YOUR_PROJECT_ID with the actual Firebase project id from settings
FCM_PUSH_URL_TEMPLATE = (
    "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
)


class PushNotificationService:

    # ------------------------------------------------------------------
    # Public API used by MonitoringService
    # ------------------------------------------------------------------

    async def send_health_alert(
        self,
        user_ids: list[UUID],
        alert: Alert,
        db: AsyncSession,
    ) -> list[dict]:
        """
        Send a push notification for a health alert to all registered devices
        belonging to each user in user_ids.
        Returns a list of send results (one per token attempted).
        """
        if not user_ids:
            return []

        tokens = await self._get_tokens_for_users(user_ids, db)
        if not tokens:
            logger.info(
                f"[Push] No registered push tokens for {len(user_ids)} users "
                f"— alert {alert.id} not pushed"
            )
            return []

        severity_emoji = "🚨" if alert.severity == "CRITICAL" else "⚠️"
        payload = {
            "title": f"{severity_emoji} {alert.title}",
            "body": alert.message[:200],  # Expo max body length
            "data": {
                "alert_id": str(alert.id),
                "patient_id": str(alert.patient_id),
                "severity": alert.severity,
                "metric_type": alert.metric_type or "",
                "metric_value": str(alert.metric_value or ""),
                "type": "health_alert",
            },
            "sound": "default",
            "priority": "high",
            # Android channel for high-priority medical alerts
            "channelId": "medical_alerts",
        }

        results = []
        expo_tokens = [t for t in tokens if t.provider == "expo" or t.token.startswith("ExponentPushToken")]
        fcm_tokens  = [t for t in tokens if t.provider == "fcm" and not t.token.startswith("ExponentPushToken")]

        if expo_tokens:
            expo_results = await self._send_expo_batch(
                tokens=expo_tokens,
                payload=payload,
                alert=alert,
                db=db,
            )
            results.extend(expo_results)

        if fcm_tokens:
            fcm_results = await self._send_fcm_batch(
                tokens=fcm_tokens,
                payload=payload,
                alert=alert,
                db=db,
            )
            results.extend(fcm_results)

        return results

    async def send_custom_push(
        self,
        user_id: UUID,
        title: str,
        body: str,
        data: Optional[dict] = None,
        db: Optional[AsyncSession] = None,
    ) -> list[dict]:
        """Generic push — used by other services (e.g. medication reminder push)."""
        if not db:
            return []
        tokens = await self._get_tokens_for_users([user_id], db)
        if not tokens:
            return []
        payload = {
            "title": title,
            "body": body[:200],
            "data": data or {},
            "sound": "default",
            "priority": "normal",
            "channelId": "general",
        }
        expo_tokens = [t for t in tokens if t.provider == "expo" or t.token.startswith("ExponentPushToken")]
        return await self._send_expo_batch(tokens=expo_tokens, payload=payload, db=db)

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def register_token(
        self,
        user_id: UUID,
        token: str,
        provider: str = "expo",
        device_label: Optional[str] = None,
        db: AsyncSession = None,
    ) -> DevicePushToken:
        """Upsert a push token for a user (called from the registration endpoint)."""
        res = await db.execute(
            select(DevicePushToken).where(
                DevicePushToken.user_id == user_id,
                DevicePushToken.token == token,
            )
        )
        existing = res.scalar_one_or_none()
        if existing:
            existing.is_active = True
            existing.provider = provider
            if device_label:
                existing.device_label = device_label
            await db.commit()
            return existing

        new_token = DevicePushToken(
            user_id=user_id,
            token=token,
            provider=provider,
            device_label=device_label,
            is_active=True,
        )
        db.add(new_token)
        await db.commit()
        await db.refresh(new_token)
        logger.info(f"[Push] Registered {provider} token for user {user_id}")
        return new_token

    async def deregister_token(self, user_id: UUID, token: str, db: AsyncSession):
        """Mark a token inactive (called on logout or token rotation)."""
        res = await db.execute(
            select(DevicePushToken).where(
                DevicePushToken.user_id == user_id,
                DevicePushToken.token == token,
            )
        )
        existing = res.scalar_one_or_none()
        if existing:
            existing.is_active = False
            await db.commit()

    # ------------------------------------------------------------------
    # Internal — Expo
    # ------------------------------------------------------------------

    async def _send_expo_batch(
        self,
        tokens: list[DevicePushToken],
        payload: dict,
        alert: Optional[Alert] = None,
        db: Optional[AsyncSession] = None,
    ) -> list[dict]:
        if not tokens:
            return []

        messages = [
            {
                "to": t.token,
                **payload,
            }
            for t in tokens
        ]

        results = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    EXPO_PUSH_URL,
                    json=messages,
                    headers={
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                )
                resp_data = resp.json()
                ticket_list = resp_data.get("data", [])

                for token_obj, ticket in zip(tokens, ticket_list):
                    status = ticket.get("status", "error")
                    receipt_id = ticket.get("id")
                    error_msg = ticket.get("message", "") if status == "error" else None

                    logger.info(
                        f"[Push/Expo] token={token_obj.token[:30]}… "
                        f"status={status} receipt={receipt_id}"
                    )

                    # Deactivate invalid tokens automatically
                    if status == "error" and ticket.get("details", {}).get("error") in (
                        "DeviceNotRegistered", "InvalidCredentials"
                    ):
                        token_obj.is_active = False
                        logger.warning(f"[Push/Expo] Deactivated invalid token {token_obj.token[:30]}…")

                    # Log NotificationEvent
                    if alert and db:
                        event = NotificationEvent(
                            alert_id=alert.id,
                            recipient_user_id=token_obj.user_id,
                            channel="push",
                            status="sent" if status == "ok" else "failed",
                            provider="expo",
                            provider_message_id=receipt_id,
                            error_message=error_msg,
                            sent_at=__import__("datetime").datetime.utcnow(),
                        )
                        db.add(event)

                    results.append({"token": token_obj.token, "status": status, "receipt_id": receipt_id})

                if db:
                    await db.commit()

        except httpx.TimeoutException:
            logger.error("[Push/Expo] Request timed out")
        except Exception as exc:
            logger.error(f"[Push/Expo] Unexpected error: {exc}")

        return results

    # ------------------------------------------------------------------
    # Internal — FCM v1
    # ------------------------------------------------------------------

    async def _send_fcm_batch(
        self,
        tokens: list[DevicePushToken],
        payload: dict,
        alert: Optional[Alert] = None,
        db: Optional[AsyncSession] = None,
    ) -> list[dict]:
        """
        Send via Firebase Cloud Messaging v1 API.
        Requires FCM_PROJECT_ID and FCM_SERVICE_ACCOUNT_KEY in settings.
        Falls back gracefully if not configured.
        """
        fcm_project_id = getattr(settings, "FCM_PROJECT_ID", None)
        fcm_server_key = getattr(settings, "FCM_SERVER_KEY", None)

        if not fcm_project_id or not fcm_server_key:
            logger.debug("[Push/FCM] FCM not configured — skipping")
            return []

        results = []
        url = FCM_PUSH_URL_TEMPLATE.format(project_id=fcm_project_id)

        async with httpx.AsyncClient(timeout=10.0) as client:
            for token_obj in tokens:
                try:
                    message = {
                        "message": {
                            "token": token_obj.token,
                            "notification": {
                                "title": payload.get("title", "Health Alert"),
                                "body": payload.get("body", ""),
                            },
                            "data": {k: str(v) for k, v in payload.get("data", {}).items()},
                            "android": {
                                "priority": "HIGH",
                                "notification": {
                                    "channel_id": payload.get("channelId", "medical_alerts"),
                                    "sound": "default",
                                },
                            },
                            "apns": {
                                "payload": {
                                    "aps": {
                                        "sound": "default",
                                        "badge": 1,
                                    }
                                }
                            },
                        }
                    }
                    resp = await client.post(
                        url,
                        json=message,
                        headers={
                            "Authorization": f"Bearer {fcm_server_key}",
                            "Content-Type": "application/json",
                        },
                    )
                    status = "sent" if resp.status_code == 200 else "failed"
                    error_msg = None if status == "sent" else resp.text[:200]
                    logger.info(f"[Push/FCM] token={token_obj.token[:30]}… status={status}")

                    if alert and db:
                        event = NotificationEvent(
                            alert_id=alert.id,
                            recipient_user_id=token_obj.user_id,
                            channel="push",
                            status=status,
                            provider="fcm",
                            error_message=error_msg,
                            sent_at=__import__("datetime").datetime.utcnow(),
                        )
                        db.add(event)

                    results.append({"token": token_obj.token, "status": status})

                except Exception as exc:
                    logger.error(f"[Push/FCM] Error for token {token_obj.token[:30]}…: {exc}")

        if db:
            await db.commit()

        return results

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_tokens_for_users(
        self, user_ids: list[UUID], db: AsyncSession
    ) -> list[DevicePushToken]:
        if not user_ids:
            return []
        res = await db.execute(
            select(DevicePushToken).where(
                DevicePushToken.user_id.in_(user_ids),
                DevicePushToken.is_active == True,
            )
        )
        return list(res.scalars().all())
