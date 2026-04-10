import time
from collections import defaultdict
from typing import Dict, List


class RateLimiter:
    """Простой rate limiter на основе скользящего окна"""

    def __init__(self):
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, identifier: str, limit: int = 5, window_seconds: int = 60) -> bool:
        """
        Проверяет, может ли identifier отправить ещё один запрос

        Args:
            identifier: Уникальный ID (например, user_id)
            limit: Максимум запросов в окне
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
