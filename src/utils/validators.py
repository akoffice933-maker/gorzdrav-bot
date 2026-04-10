import html
import re
from typing import Optional, Tuple


def sanitize_string(value: Optional[str], max_length: int = 255) -> str:
    """
    Санитизирует строку: экранирует HTML, обрезает, очищает пробелы

    Args:
        value: Входная строка
        max_length: Максимальная длина (по умолчанию 255)

    Returns:
        Очищенная строка
    """
    if not value or not isinstance(value, str):
        return ""

    # Экранируем HTML сущности
    sanitized = html.escape(value)

    # Удаляем лишние пробелы
    sanitized = " ".join(sanitized.split())

    # Обрезаем до максимальной длины
    return sanitized[:max_length]


def validate_medical_input(text: str, max_length: int = 2000) -> Tuple[bool, str]:
    """
    Валидирует пользовательский ввод для медицинских запросов.
    Возвращает (is_valid, sanitized_text_or_error)
    """
    if not text or not isinstance(text, str):
        return False, "Текст не может быть пустым"

    text = text.strip()

    if len(text) < 5:
        return False, "Текст слишком короткий (минимум 5 символов)"

    if len(text) > max_length:
        return False, f"Текст слишком длинный (максимум {max_length} символов)"

    # Проверяем на попытку prompt injection
    injection_patterns = [
        r'\b(exec|eval|__import__|__builtins__|system|os\.|subprocess)\b',
        r'(ignore|override|forget|disregard)\s*(previous|all|the\s+)?(instruction|prompt|rule|system)',
        r'(system|admin|root|moderator)\s*(role|mode|command|access)',
        r'<script|javascript:|onerror=|onclick=',
        r'you\s+are\s+now\s+',
        r'pretend\s+to\s+be\s+',
        r'ignore\s+safet',
    ]

    for pattern in injection_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return False, "Подозрительный текст обнаружен"

    # Санитизируем
    safe_text = sanitize_string(text, max_length=max_length)
    return True, safe_text


def validate_file_size(file_size: int, max_mb: int = 20) -> Tuple[bool, str]:
    """Проверяет размер файла"""
    max_bytes = max_mb * 1024 * 1024

    if file_size > max_bytes:
        return False, f"Файл слишком большой ({file_size/1024/1024:.1f}MB > {max_mb}MB)"

    return True, ""


def validate_api_response(data: dict, required_fields: list) -> Tuple[bool, str]:
    """Валидирует ответ от API"""
    if not isinstance(data, dict):
        return False, "Неверный формат ответа"

    for field in required_fields:
        if field not in data:
            return False, f"Отсутствует обязательное поле: {field}"

    return True, ""
