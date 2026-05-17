from time import time
from fastapi import HTTPException, Request


_RATE_BUCKETS: dict[str, list[float]] = {}


def _client_identifier(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded_for:
        return forwarded_for
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(request: Request, action: str, max_requests: int, window_seconds: int) -> None:
    now = time()
    bucket_key = f"{action}:{_client_identifier(request)}"
    bucket = _RATE_BUCKETS.get(bucket_key, [])
    window_start = now - window_seconds
    bucket = [ts for ts in bucket if ts >= window_start]

    if len(bucket) >= max_requests:
        raise HTTPException(status_code=429, detail="Too many requests, please try again later")

    bucket.append(now)
    _RATE_BUCKETS[bucket_key] = bucket
