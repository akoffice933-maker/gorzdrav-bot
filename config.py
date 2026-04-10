import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# ============ ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ============

BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN or len(BOT_TOKEN) < 10:
    raise ValueError("BOT_TOKEN не установлен или неверен в .env")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY or len(OPENROUTER_API_KEY) < 10:
    raise ValueError("OPENROUTER_API_KEY не установлен в .env")

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY не установлен в .env")

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
