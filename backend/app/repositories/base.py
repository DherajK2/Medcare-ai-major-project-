from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from typing import Generic, TypeVar, Type, Optional
from uuid import UUID

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: UUID) -> Optional[T]:
        result = await self.session.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, limit: int = 100, offset: int = 0) -> list[T]:
        result = await self.session.execute(select(self.model).limit(limit).offset(offset))
        return list(result.scalars().all())

    async def create(self, **kwargs) -> T:
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def update(self, id: UUID, **kwargs) -> Optional[T]:
        await self.session.execute(update(self.model).where(self.model.id == id).values(**kwargs))
        await self.session.commit()
        return await self.get_by_id(id)

    async def delete(self, id: UUID) -> bool:
        result = await self.session.execute(delete(self.model).where(self.model.id == id))
        await self.session.commit()
        return result.rowcount > 0

    async def count(self) -> int:
        result = await self.session.execute(select(func.count()).select_from(self.model))
        return result.scalar_one()
