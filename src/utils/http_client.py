"""
Общий HTTP-клиент для всего бота.
Переиспользует одну aiohttp.ClientSession, чтобы не создавать
новую сессию на каждый запрос.
"""
import aiohttp

_session: aiohttp.ClientSession | None = None


async def get_session() -> aiohttp.ClientSession:
    """Возвращает или создаёт глобальную сессию"""
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession()
    return _session


async def close_session():
    """Закрывает глобальную сессию (вызывать при shutdown)"""
    global _session
    if _session and not _session.closed:
        await _session.close()
        _session = None
