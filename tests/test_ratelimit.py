import pytest
import time
from src.utils.ratelimit import RateLimiter


class TestRateLimiter:
    def setup_method(self):
        self.limiter = RateLimiter()

    def test_allows_first_request(self):
        assert self.limiter.is_allowed("user_1", limit=3, window_seconds=60)

    def test_allows_up_to_limit(self):
        assert self.limiter.is_allowed("user_1", limit=3, window_seconds=60)
        assert self.limiter.is_allowed("user_1", limit=3, window_seconds=60)
        assert self.limiter.is_allowed("user_1", limit=3, window_seconds=60)
        assert not self.limiter.is_allowed("user_1", limit=3, window_seconds=60)

    def test_different_users_independent(self):
        self.limiter.is_allowed("user_1", limit=1, window_seconds=60)
        assert self.limiter.is_allowed("user_2", limit=1, window_seconds=60)

    def test_window_expiry(self):
        self.limiter.is_allowed("user_1", limit=1, window_seconds=1)
        time.sleep(1.1)
        assert self.limiter.is_allowed("user_1", limit=1, window_seconds=1)

    def test_get_remaining(self):
        self.limiter.is_allowed("user_1", limit=5, window_seconds=60)
        self.limiter.is_allowed("user_1", limit=5, window_seconds=60)
        remaining = self.limiter.get_remaining("user_1", limit=5, window_seconds=60)
        assert remaining == 3

    def test_get_remaining_zero(self):
        self.limiter.is_allowed("user_1", limit=1, window_seconds=60)
        remaining = self.limiter.get_remaining("user_1", limit=1, window_seconds=60)
        assert remaining == 0
