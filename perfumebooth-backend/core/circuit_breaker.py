import time
import threading
from typing import Callable, Any

class CircuitBreakerOpenException(Exception):
    """Exception raised when the circuit breaker is OPEN."""
    pass

class CircuitBreaker:
    """
    A simple, thread-safe Circuit Breaker implementation to wrap external dependency calls.
    
    States:
      - CLOSED: Requests go through. Fails increment failure count.
      - OPEN: Requests fast-fail immediately. Transitions to HALF-OPEN after recovery_timeout.
      - HALF-OPEN: Trial requests go through. Success resets to CLOSED, failure trips back to OPEN.
    """
    def __init__(self, name: str, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF-OPEN
        self.last_state_change = time.time()
        self.lock = threading.Lock()

    def __call__(self, func: Callable[..., Any]) -> Callable[..., Any]:
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper

    def call(self, func: Callable[..., Any], *args, **kwargs) -> Any:
        with self.lock:
            # Transition from OPEN to HALF-OPEN if cooldown period has elapsed
            if self.state == "OPEN":
                if time.time() - self.last_state_change > self.recovery_timeout:
                    self.state = "HALF-OPEN"
                    self.last_state_change = time.time()
                else:
                    raise CircuitBreakerOpenException(f"Circuit breaker '{self.name}' is OPEN. Fast-failing.")

        try:
            # Attempt the resource execution
            result = func(*args, **kwargs)
            
            with self.lock:
                if self.state == "HALF-OPEN":
                    # Single success in HALF-OPEN is enough to recover/close circuit
                    self.state = "CLOSED"
                    self.failure_count = 0
                    self.last_state_change = time.time()
            return result
        except Exception as e:
            with self.lock:
                self.failure_count += 1
                if self.state in ("CLOSED", "HALF-OPEN") and self.failure_count >= self.failure_threshold:
                    self.state = "OPEN"
                    self.last_state_change = time.time()
            raise e
