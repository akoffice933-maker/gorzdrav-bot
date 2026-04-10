import logging
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler


def setup_logger(name: str = "gorzdrav_bot") -> logging.Logger:
    """Настройка логирования с ротацией файлов и консольным выводом"""

    # Создаём директорию для логов
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    logger = logging.getLogger(name)

    # Получаем уровень из конфига
    try:
        from config import LOG_LEVEL, LOG_FILE
        logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    except ImportError:
        logger.setLevel(logging.INFO)
        LOG_FILE = "logs/bot.log"

    # Проверяем, нет ли уже handlers (предотвращаем дублирование)
    if logger.hasHandlers():
        return logger

    # Формат для логов
    log_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Консоль handler — в терминал
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)

    # Файл handler с ротацией
    try:
        file_handler = RotatingFileHandler(
            filename=LOG_FILE,
            maxBytes=10_000_000,  # 10 MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(log_format)
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"Failed to setup file logging: {e}")

    return logger


# Глобальный логер
logger = setup_logger()
