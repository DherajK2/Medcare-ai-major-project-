from app.providers.maps.base import MapsProvider, Facility
from app.utils.logger import get_logger

logger = get_logger(__name__)

class MapService:
    def __init__(self, provider: MapsProvider):
        self.provider = provider

    async def find_nearby_facilities(self, lat: float, lon: float, category: str, radius_km: float = 5.0) -> list[dict]:
        facilities = await self.provider.search_nearby(lat, lon, category, radius_km)
        return [
            {
                "name": f.name,
                "category": f.category,
                "lat": f.lat,
                "lon": f.lon,
                "address": f.address,
                "phone": f.phone,
                "distance_km": f.distance_km,
                "osm_id": f.osm_id,
            }
            for f in facilities
        ]
