from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_active_user
from app.services.map_service import MapService
from app.providers.maps.osm_provider import OpenStreetMapProvider

router = APIRouter()

@router.get("/nearby")
async def find_nearby(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    category: str = Query(default="hospital", description="Category: hospital, pharmacy, clinic, emergency, doctor"),
    radius_km: float = Query(default=5.0, ge=0.5, le=50.0),
    current_user=Depends(get_current_active_user)
):
    map_svc = MapService(OpenStreetMapProvider())
    return await map_svc.find_nearby_facilities(lat, lon, category, radius_km)
