import httpx
import math
from .base import MapsProvider, Facility
from app.utils.logger import get_logger

logger = get_logger(__name__)

CATEGORY_MAP = {
    "hospital": "[amenity=hospital]",
    "pharmacy": "[amenity=pharmacy]",
    "clinic": "[amenity=clinic]",
    "emergency": "[emergency=yes]",
    "doctor": "[amenity=doctors]",
    "dentist": "[amenity=dentist]",
}

class OpenStreetMapProvider(MapsProvider):
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"

    async def search_nearby(self, lat: float, lon: float, category: str, radius_km: float = 5.0) -> list[Facility]:
        tag = CATEGORY_MAP.get(category, "[amenity=hospital]")
        radius_m = int(radius_km * 1000)
        query = f"""[out:json][timeout:25];
(node{tag}(around:{radius_m},{lat},{lon});way{tag}(around:{radius_m},{lat},{lon}););
out center tags;"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(self.OVERPASS_URL, data={"data": query})
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error("OSM search failed", error=str(e))
            return []

        facilities = []
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            e_lat = element.get("lat") or element.get("center", {}).get("lat")
            e_lon = element.get("lon") or element.get("center", {}).get("lon")
            if not (e_lat and e_lon):
                continue
            dist = self._haversine(lat, lon, e_lat, e_lon)
            facilities.append(Facility(
                name=tags.get("name", "Unknown Facility"),
                category=category,
                lat=e_lat,
                lon=e_lon,
                address=tags.get("addr:full") or tags.get("addr:street"),
                phone=tags.get("phone"),
                distance_km=round(dist, 2),
                osm_id=str(element.get("id")),
            ))
        return sorted(facilities, key=lambda f: f.distance_km or 999)[:20]

    def _haversine(self, lat1, lon1, lat2, lon2) -> float:
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
