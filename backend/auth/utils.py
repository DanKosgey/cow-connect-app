from typing import Optional
from fastapi import Request

def get_client_ip(request: Request) -> str:
    """Get the client IP address from the request."""
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0]
    elif request.client and request.client.host:
        return request.client.host
    return "unknown"