# 💻 Готовый код для рефакторинга

## 1. Безопасный конфиг (скопируйте как есть)

**`.env.example`** - добавьте в .gitignore и создайте `.env` локально:
```
# Telegram Bot
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database
DATABASE_URL=sqlite:///med_bot.db

# Encryption (сгенерируйте своим: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxx=

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/bot.log

# ESIA (только если используете)
ESIA_CLIENT_ID=
ESIA_CLIENT_SECRET=
ESIA_PRIVATE_KEY_PATH=

# Server
BOT_POLLING_MODE=long_polling
```

**Новый `config.py`:**
```python
import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# ============ ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ============

BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN or len(BOT_TOKEN) < 10:
    raise ValueError("❌ BOT_TOKEN не установлен или неверен в .env")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY or len(OPENROUTER_API_KEY) < 10:
    raise ValueError("❌ OPENROUTER_API_KEY не установлен в .env")

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("❌ ENCRYPTION_KEY не установлен в .env")

# ============ ОПЦИОНАЛЬНЫЕ ПЕРЕМЕННЫЕ ============

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///med_bot.db")

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "logs/bot.log")

# ESIA (для авторизации через Госуслуги)
ESIA_CLIENT_ID = os.getenv("ESIA_CLIENT_ID", "")
ESIA_CLIENT_SECRET = os.getenv("ESIA_CLIENT_SECRET", "")
ESIA_PRIVATE_KEY_PATH = os.getenv("ESIA_PRIVATE_KEY_PATH", "")

# Bot settings
BOT_POLLING_MODE = os.getenv("BOT_POLLING_MODE", "long_polling")

# API settings
API_TIMEOUT = 15
MAX_RETRIES = 3
CACHE_TTL = 3600

# Medical data settings
MAX_MEDICAL_INPUT_LENGTH = 2000
MAX_FILE_SIZE_MB = 20
OCR_LANGUAGES = ["ru", "en"]
```

---

## 2. Логирование (готово к использованию)

**`src/utils/logger.py`:**
```python
import logging
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logger(name: str = "gorzdrav_bot") -> logging.Logger:
    """Настройка логирования с ротацией файлов и консольным выводом"""
    
    # Создаем директорию для логов
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    logger = logging.getLogger(name)
    
    # Получаем уровень из конфига
    from config import LOG_LEVEL, LOG_FILE
    logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    
    # Проверяем, нет ли уже handlers (предотвращаем дублирование)
    if logger.hasHandlers():
        return logger
    
    # Формат для логов
    log_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Консоль handler - в терминал
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)
    
    # Файл handler с ротацией
    file_handler = RotatingFileHandler(
        filename=LOG_FILE,
        maxBytes=10_000_000,  # 10 MB  
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(log_format)
    logger.addHandler(file_handler)
    
    return logger

# Глобальный логер
logger = setup_logger()

# Используйте где угодно:
# from src.utils.logger import logger
# logger.info("Hello")
# logger.error("Error", exc_info=True)
```

**Использование в других файлах:**
```python
from src.utils.logger import logger

# Вместо: print(f"User {id} clicked button")
logger.info(f"User {id} clicked button")

# Вместо: print(f"Error: {e}")
logger.error(f"Error occurred", exc_info=True)
```

---

## 3. Валидация данных

**`src/utils/validators.py`:**
```python
import html
import re
from typing import Optional, Tuple

def sanitize_string(value: Optional[str], max_length: int = 255) -> str:
    """
    Санитизирует строку: удаляет HTML, обрезает, очищает пробелы
    
    Args:
        value: Входная строка
        max_length: Максимальная длина (по умолчанию 255)
    
    Returns:
        Очищенная строка
    """
    if not value or not isinstance(value, str):
        return ""
    
    # Удаляем HTML теги
    sanitized = html.escape(value)
    
    # Удаляем лишние пробелы
    sanitized = " ".join(sanitized.split())
    
    # Обрезаем до максимальной длины
    return sanitized[:max_length]


def validate_medical_symptoms(text: str) -> Tuple[bool, str]:
    """
    Валидирует текст симптомов пользователя
    
    Returns:
        (is_valid, error_message_or_sanitized_text)
    """
    if not text or not isinstance(text, str):
        return False, "❌ Текст не может быть пустым"
    
    text = text.strip()
    
    if len(text) < 5:
        return False, "❌ Текст слишком короткий (минимум 5 символов)"
    
    if len(text) > 2000:
        return False, "❌ Текст слишком длинный (максимум 2000 символов)"
    
    # Проверяем на попытку injection
    injection_patterns = [
        r'\b(exec|eval|__import__|__builtins__|system|os\.|subprocess)\b',
        r'(ignore|override|forget).*\b(instruction|prompt|rule)\b',
        r'(system|admin|root|moderator)\s*(role|mode|command|access)',
        r'<script|javascript:|onerror=|onclick=',
    ]
    
    for pattern in injection_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return False, "❌ Подозрительный текст обнаружен"
    
    # Санитизируем
    safe_text = sanitize_string(text, max_length=2000)
    return True, safe_text


def validate_file_size(file_size: int, max_mb: int = 20) -> Tuple[bool, str]:
    """Проверяет размер файла"""
    max_bytes = max_mb * 1024 * 1024
    
    if file_size > max_bytes:
        return False, f"❌ Файл слишком большой ({file_size/1024/1024:.1f}MB > {max_mb}MB)"
    
    return True, ""


def validate_api_response(data: dict, required_fields: list) -> Tuple[bool, str]:
    """Валидирует ответ от API"""
    if not isinstance(data, dict):
        return False, "Invalid response format"
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    return True, ""
```

**Использование:**
```python
from src.utils.validators import validate_medical_symptoms

@dp.message(MedStates.waiting_symptoms)
async def handle_symptoms(message: Message, state: FSMContext):
    is_valid, result = validate_medical_symptoms(message.text)
    
    if not is_valid:
        await message.answer(result)  # Ошибка
        return
    
    # result теперь безопасная строка
    await message.answer("🔬 Подбираю анализы...")
    analysis = await suggest_tests(result)
    await message.answer(analysis)
    await state.clear()
```

---

## 4. Rate Limiting

**`src/utils/ratelimit.py`:**
```python
import time
from collections import defaultdict
from typing import Dict, List
from src.utils.logger import logger

class RateLimiter:
    """Простой rate limiter на основе скользящего окна"""
    
    def __init__(self):
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, identifier: str, limit: int = 5, window_seconds: int = 60) -> bool:
        """
        Проверяет, может ли identifier отправить еще один запрос
        
        Args:
            identifier: Уникальный ID (например, user_id)
            limit: Максимало запросов в окне
            window_seconds: Длительность окна в секундах
        
        Returns:
            True если разрешено, False если превышен лимит
        """
        now = time.time()
        
        # Удаляем старые запросы за пределами окна
        self.requests[identifier] = [
            timestamp for timestamp in self.requests[identifier]
            if now - timestamp < window_seconds
        ]
        
        # Проверяем лимит
        if len(self.requests[identifier]) >= limit:
            return False
        
        # Добавляем текущий запрос
        self.requests[identifier].append(now)
        return True
    
    def get_remaining(self, identifier: str, limit: int = 5, window_seconds: int = 60) -> int:
        """Возвращает оставшееся кол-во запросов"""
        now = time.time()
        valid_requests = [
            t for t in self.requests[identifier]
            if now - t < window_seconds
        ]
        return max(0, limit - len(valid_requests))


# Глобальный rate limiter
rate_limiter = RateLimiter()

# Использование:
if not rate_limiter.is_allowed(f"user_{user_id}", limit=3, window_seconds=60):
    remaining = rate_limiter.get_remaining(f"user_{user_id}")
    await message.answer(f"⏰ Слишком много запросов. Попробуйте через минуту. ({remaining}/3)")
    return
```

---

## 5. Правильная обработка ошибок в AI запросах

**Обновленный `ai_analyzer.py`:**
```python
import aiohttp
import asyncio
from config import OPENROUTER_API_KEY
from src.utils.logger import logger
from src.utils.validators import validate_medical_symptoms

DISCLAIMER = "\n\n---\n⚠️ **Важно:** Это не замена консультации врача. Я только помогаю с информацией. Все решения принимайте с врачом."

MAX_RETRIES = 2
TIMEOUT = 20


async def call_qwen(prompt: str, retry: int = 0) -> str:
    """
    Вызов Qwen через OpenRouter с обработкой ошибок
    """
    if not prompt or len(prompt) > 2000:
        logger.warning(f"Invalid prompt length: {len(prompt) if prompt else 0}")
        return "❌ Ошибка обработки входных данных" + DISCLAIMER
    
    try:
        timeout = aiohttp.ClientTimeout(total=TIMEOUT)
        async with aiohttp.ClientSession(timeout=timeout) as session:
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
                }
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data["choices"][0]["message"]["content"]
                    logger.info(f"Successful API call (retry: {retry})")
                    return result + DISCLAIMER
                
                elif resp.status == 429:  # Rate limited
                    if retry < MAX_RETRIES:
                        wait_time = 2 ** retry  # 1, 2, 4 секунды
                        logger.warning(f"Rate limited, retry #{retry + 1} after {wait_time}s")
                        await asyncio.sleep(wait_time)
                        return await call_qwen(prompt, retry + 1)
                    else:
                        logger.error("Max retries exceeded due to rate limiting")
                        return "⚠️ API перегружен. Попробуйте через минуту." + DISCLAIMER
                
                elif resp.status == 401:
                    logger.error("Invalid API key")
                    return "❌ Ошибка конфигурации API" + DISCLAIMER
                
                else:
                    error_text = await resp.text()
                    logger.error(f"API error {resp.status}: {error_text[:200]}")
                    return f"⚠️ Ошибка API {resp.status}. Попробуйте позже." + DISCLAIMER
    
    except asyncio.TimeoutError:
        logger.warning(f"Timeout on attempt {retry}")
        if retry < MAX_RETRIES:
            await asyncio.sleep(2)
            return await call_qwen(prompt, retry + 1)
        else:
            return "⏰ Таймаут. API не отвечает. Попробуйте позже." + DISCLAIMER
    
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {str(e)}", exc_info=True)
        return f"⚠️ Ошибка: {type(e).__name__}" + DISCLAIMER


async def suggest_tests(symptoms: str) -> str:
    """Подбирает анализы на основе симптомов"""
    is_valid, result = validate_medical_symptoms(symptoms)
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
    is_valid, result = validate_medical_symptoms(ocr_text)
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
    is_valid, result = validate_medical_symptoms(question)
    if not is_valid:
        return result
    
    prompt = f"""Вопрос пользователя: {result}

Ответь полезно, коротко (1-2 параграфа), и предупреди, что это не медицинская консультация.
Если вопрос не о здоровье или медицине — вежливо откажись: "Я помогаю только с медицинскими вопросами."
"""
    
    return await call_qwen(prompt)
```

---

## 6. Правильная работа с БД

**`src/models/database.py`:**
```python
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, BigInteger, Boolean, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import datetime
import os
from config import DATABASE_URL

# Настройка БД в зависимости от типа
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
else:
    # PostgreSQL
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    tg_id = Column(BigInteger, unique=True, nullable=False, index=True)
    
    # Запись к врачу
    district_id = Column(Integer, nullable=True)
    lpu_id = Column(Integer, nullable=True)
    lpu_name = Column(String(255), nullable=True)
    doctor_id = Column(Integer, nullable=True)
    doctor_name = Column(String(255), nullable=True)
    appointment_time = Column(DateTime, nullable=True)
    reminder_sent = Column(Boolean, default=False)
    
    # Авторизация ESIA
    esia_token = Column(Text, nullable=True)
    esia_token_expires = Column(DateTime, nullable=True)
    
    # Служебное
    created_at = Column(DateTime, default=datetime.datetime.now)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    
    __table_args__ = (
        Index('idx_tg_id_appointment', 'tg_id', 'appointment_time'),
        Index('idx_appointment_reminder', 'appointment_time', 'reminder_sent'),
    )


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"
    
    id = Column(Integer, primary_key=True)
    tg_id = Column(BigInteger, nullable=False, index=True)
    analysis_type = Column(String(50), nullable=True)  # 'ocr' или 'question'
    raw_text = Column(Text, nullable=False)
    ai_analysis = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.datetime.now, index=True)
    
    __table_args__ = (
        Index('idx_tg_id_created', 'tg_id', 'created_at'),
    )


# Создание таблиц при первом запуске
Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency для получения сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 7. Главный хендлер с обработкой ошибок

**Обновленный начало `bot.py`:**
```python
import asyncio
import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from config import BOT_TOKEN
from src.utils.logger import logger
from src.utils.ratelimit import rate_limiter
from src.models.database import SessionLocal, User
from src.bot.handlers import (
    auth_router,
    booking_router,
    analysis_router,
    question_router
)

# Инициализация
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Регистрация роутеров
dp.include_router(auth_router)
dp.include_router(booking_router)
dp.include_router(analysis_router)
dp.include_router(question_router)


@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    """Главное меню"""
    try:
        await state.clear()
        
        # Rate limit
        if not rate_limiter.is_allowed(f"user_{message.from_user.id}", limit=10, window_seconds=60):
            await message.answer("⏰ Слишком много команд")
            return
        
        # Регистрируем пользователя
        session = SessionLocal()
        try:
            existing_user = session.query(User).filter_by(tg_id=message.from_user.id).first()
            if not existing_user:
                session.add(User(tg_id=message.from_user.id))
                session.commit()
                logger.info(f"New user registered: {message.from_user.id}")
        except Exception as e:
            logger.error(f"Error saving user: {e}", exc_info=True)
            session.rollback()
        finally:
            session.close()
        
        # Главное меню
        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🩺 Записаться", callback_data="book")],
            [InlineKeyboardButton(text="🔬 Анализ", callback_data="analyze")],
            [InlineKeyboardButton(text="💊 Вопрос ИИ", callback_data="ask")],
            [InlineKeyboardButton(text="📋 Симптомы", callback_data="symptoms")],
            [InlineKeyboardButton(text="📅 Мои записи", callback_data="my_appointments")]
        ])
        
        await message.answer(
            "👋 Привет! Я медицинский помощник с ИИ.\n\n"
            "⚠️ **Не забывайте:** Я не заменяю врача!\n\n"
            "Выберите действие:",
            reply_markup=keyboard
        )
    
    except Exception as e:
        logger.error(f"Error in start command: {e}", exc_info=True)
        await message.answer("❌ Ошибка. Попробуйте /start снова.")


async def main():
    """Точка входа"""
    try:
        logger.info("🚀 Bot starting...")
        
        # Запуск polling
        await dp.start_polling(
            bot,
            allowed_updates=dp.resolve_used_update_types(),
            skip_updates=False
        )
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
    finally:
        logger.info("Bot stopped")
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot interrupted by user")
```

---

## Быстрый старт

1. **Установите зависимости:**
```bash
pip install -r requirements.txt
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

2. **Создайте файлы:**
```bash
# Скопируйте код выше в соответствующие файлы:
# - .env.example → .env (и отредактируйте значения)
# - config.py
# - src/utils/logger.py
# - src/utils/validators.py
# - src/utils/ratelimit.py
# - ai_analyzer.py
# - src/models/database.py
# - bot.py (измененная версия)
```

3. **Запустите:**
```bash
python bot.py
```

4. **Видите логи? Отлично! 🎉**

---

*Готовый код предоставлен 10/04/2026*
