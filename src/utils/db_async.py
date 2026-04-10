"""
Асинхронные обёртки для синхронных операций с БД.
Все обращения к SQLAlchemy проходят через asyncio.to_thread,
чтобы не блокировать event loop бота.
"""
import asyncio
from typing import Callable, TypeVar, Any
from functools import wraps
from src.models.database import SessionLocal

T = TypeVar("T")


async def run_db_operation(func: Callable[..., T], *args, **kwargs) -> T:
    """
    Выполняет синхронную функцию с БД в отдельном потоке.

    Пример использования:
        user = await run_db_operation(get_user_by_tg_id, tg_id)

        async def get_user_by_tg_id(tg_id):
            session = SessionLocal()
            try:
                return session.query(User).filter_by(tg_id=tg_id).first()
            finally:
                session.close()
    """
    return await asyncio.to_thread(func, *args, **kwargs)
