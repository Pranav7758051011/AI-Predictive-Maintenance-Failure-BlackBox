import time
import logging
from flask import Flask, request, g

logger = logging.getLogger("app.access")

def register_request_logger(app: Flask):
    """Registers before_request and after_request hooks for performance and access logging."""

    @app.before_request
    def start_timer():
        g.start_time = time.time()

    @app.after_request
    def log_request(response):
        if hasattr(g, "start_time"):
            duration_ms = round((time.time() - g.start_time) * 1000, 2)
        else:
            duration_ms = 0.0

        client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
        status_code = response.status_code
        method = request.method
        path = request.path

        log_msg = f"{client_ip} - [{method}] {path} -> {status_code} ({duration_ms}ms)"

        if status_code >= 500:
            logger.error(log_msg)
        elif status_code >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        # Append execution latency header for client debugging
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        return response
