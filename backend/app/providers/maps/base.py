from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class Facility:
    name: str
    category: str
    lat: float
    lon: float
    address: Optional[str] = None
    phone: Optional[str] = None
    distance_km: Optional[float] = None
    osm_id: Optional[str] = None

class MapsProvider(ABC):
    @abstractmethod
    async def search_nearby(self, lat: float, lon: float, category: str, radius_km: float = 5.0) -> list[Facility]:
        ...
