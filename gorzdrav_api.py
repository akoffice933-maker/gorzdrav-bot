import aiohttp
from typing import List, Dict
import asyncio
from src.utils.logger import logger
from src.utils.http_client import get_session
from config import API_TIMEOUT, MAX_RETRIES

BASE_URL = "https://gorzdrav.spb.ru/_api/api/v2"
HEADERS = {"User-Agent": "GorzdravBot/1.0"}


async def _safe_request(url: str, retry: int = 0) -> List[Dict]:
    """
    Универсальная функция с обработкой разных форматов ответа и retry-логикой
    """
    try:
        session = await get_session()
        timeout = aiohttp.ClientTimeout(total=API_TIMEOUT)

        async with session.get(url, headers=HEADERS, timeout=timeout) as resp:
            if resp.status == 200:
                data = await resp.json()

                # Пробуем разные возможные форматы ответа
                if isinstance(data, list):
                    return data
                if isinstance(data, dict):
                    if "result" in data:
                        return data["result"] if isinstance(data["result"], list) else []
                    if "data" in data:
                        return data["data"] if isinstance(data["data"], list) else []

                return []

            # Retry для rate limit и transient ошибок
            elif resp.status in (429, 408, 500, 502, 503, 504):
                if retry < MAX_RETRIES:
                    wait_time = 2 ** retry
                    logger.warning(f"Retryable error {resp.status}, retry #{retry + 1} after {wait_time}s")
                    await asyncio.sleep(wait_time)
                    return await _safe_request(url, retry + 1)
                else:
                    logger.error(f"Max retries exceeded for {url} (status: {resp.status})")
                    return []

            else:
                error_body = ""
                try:
                    error_body = (await resp.text())[:200]
                except Exception:
                    pass
                logger.error(f"API error {resp.status} for {url}: {error_body}")
                return []

    except asyncio.TimeoutError:
        logger.error(f"Timeout requesting {url}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error requesting {url}: {type(e).__name__}", exc_info=True)
        return []


async def get_districts() -> List[Dict]:
    return await _safe_request(f"{BASE_URL}/shared/districts")


async def get_lpus_by_district(district_id: int) -> List[Dict]:
    return await _safe_request(f"{BASE_URL}/shared/district/{district_id}/lpus")


async def get_specialties(lpu_id: int) -> List[Dict]:
    return await _safe_request(f"{BASE_URL}/schedule/lpu/{lpu_id}/specialties")


async def get_doctors(lpu_id: int, specialty_id: int) -> List[Dict]:
    return await _safe_request(f"{BASE_URL}/schedule/lpu/{lpu_id}/speciality/{specialty_id}/doctors")


async def get_free_appointments(lpu_id: int, doctor_id: int) -> List[Dict]:
    return await _safe_request(f"{BASE_URL}/schedule/lpu/{lpu_id}/doctor/{doctor_id}/appointments")
