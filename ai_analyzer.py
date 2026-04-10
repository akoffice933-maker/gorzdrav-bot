import aiohttp
import asyncio
from config import OPENROUTER_API_KEY
from src.utils.logger import logger
from src.utils.validators import validate_medical_input
from src.utils.http_client import get_session

DISCLAIMER = "\n\n---\n⚠️ **Важно**: Это не замена консультации врача. Я только помогаю с информацией. Все решения принимайте с врачом."

MAX_RETRIES = 2
TIMEOUT = 20


async def call_qwen(prompt: str, retry: int = 0) -> str:
    """
    Вызов Qwen через OpenRouter с обработкой ошибок.
    Использует общую HTTP-сессию (не создаёт новую на каждый вызов).
    """
    if not prompt or len(prompt) > 4000:
        logger.warning(f"Invalid prompt length: {len(prompt) if prompt else 0}")
        return "Ошибка обработки входных данных" + DISCLAIMER

    try:
        session = await get_session()
        timeout = aiohttp.ClientTimeout(total=TIMEOUT)

        async with session.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com",
                "X-Title": "Gorzdrav Medical Bot"
            },
            json={
                "model": "qwen/qwen3.6-plus-preview",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 1500
            },
            timeout=timeout
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                result = data["choices"][0]["message"]["content"]
                logger.info(f"Successful API call (retry: {retry})")
                return result + DISCLAIMER

            elif resp.status == 429:  # Rate limited
                if retry < MAX_RETRIES:
                    wait_time = 2 ** retry
                    logger.warning(f"Rate limited, retry #{retry + 1} after {wait_time}s")
                    await asyncio.sleep(wait_time)
                    return await call_qwen(prompt, retry + 1)
                else:
                    logger.error("Max retries exceeded due to rate limiting")
                    return "API перегружен. Попробуйте через минуту." + DISCLAIMER

            elif resp.status == 401:
                logger.error("Invalid API key")
                return "Ошибка конфигурации API" + DISCLAIMER

            else:
                error_text = await resp.text()
                logger.error(f"API error {resp.status}: {error_text[:200]}")
                return f"Ошибка API {resp.status}. Попробуйте позже." + DISCLAIMER

    except asyncio.TimeoutError:
        logger.warning(f"Timeout on attempt {retry}")
        if retry < MAX_RETRIES:
            await asyncio.sleep(2)
            return await call_qwen(prompt, retry + 1)
        else:
            return "Таймаут. API не отвечает. Попробуйте позже." + DISCLAIMER

    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {str(e)}", exc_info=True)
        return f"Ошибка: {type(e).__name__}" + DISCLAIMER


async def suggest_tests(symptoms: str) -> str:
    """Подбирает анализы на основе симптомов"""
    is_valid, result = validate_medical_input(symptoms)
    if not is_valid:
        return result

    prompt = f"""Ты — медицинский ассистент. У человека симптомы: {result}.

Напиши список анализов, которые стоит сдать, и кратко объясни зачем каждый.
Формат: маркированный список с короткими пояснениями.
Не ставь диагноз, только рекомендации.

Пример:
• ОАК + СОЭ — проверить наличие воспалительного процесса
• СРБ — уточнить степень воспаления"""

    return await call_qwen(prompt)


async def analyze_lab_result(ocr_text: str) -> str:
    """Расшифровывает результат анализа"""
    is_valid, result = validate_medical_input(ocr_text, max_length=4000)
    if not is_valid:
        return result

    prompt = f"""Расшифруй результат лабораторного анализа:

{result}

Выполни:
1. Найди каждый показатель и его значение
2. Сравни с референсными значениями (если указаны)
3. Отметь отклонения стрелками (↑/↓)
4. Дай 2-3 вопроса врачу

Формат:
📊 Результаты:
• Показатель: значение (норма X) → ↑/↓ — пояснение

❓ Вопросы врачу:
1. ...
2. ...

Не ставь диагноз."""

    return await call_qwen(prompt)


async def answer_question(question: str) -> str:
    """Отвечает на вопрос о здоровье"""
    is_valid, result = validate_medical_input(question)
    if not is_valid:
        return result

    prompt = f"""Вопрос пользователя: {result}

Ответь полезно, коротко (1-2 параграфа), и предупреди, что это не медицинская консультация.
Если вопрос не о здоровье или медицине — вежливо откажись: "Я помогаю только с медицинскими вопросами."
"""

    return await call_qwen(prompt)
