import os
import json
import uuid
from typing import Optional, Any

try:
    import redis
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False

_redis_client: Optional[Any] = None
_redis_enabled: bool = False


def get_redis():
    global _redis_client, _redis_enabled
    if not _REDIS_AVAILABLE:
        return None
    if _redis_client is None:
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            _redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            _redis_client.ping()
            _redis_enabled = True
        except Exception:
            _redis_client = None
            _redis_enabled = False
    return _redis_client


def is_redis_enabled() -> bool:
    return _redis_enabled


def generate_job_id() -> str:
    return str(uuid.uuid4())


def enqueue_job(job_id: str, payload: dict) -> bool:
    r = get_redis()
    if r is None:
        return False
    try:
        payload_str = json.dumps(payload)
        r.setex(f"sim:job:{job_id}", 3600, json.dumps({"status": "queued", "payload": payload}))
        r.publish("sim:jobs", json.dumps({"job_id": job_id, "payload": payload}))
        return True
    except Exception:
        return False


def get_job_result(job_id: str) -> Optional[dict]:
    r = get_redis()
    if r is None:
        return None
    try:
        raw = r.get(f"sim:job:{job_id}")
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_job_result(job_id: str, result: dict) -> bool:
    r = get_redis()
    if r is None:
        return False
    try:
        r.setex(f"sim:job:{job_id}", 3600, json.dumps(result))
        return True
    except Exception:
        return False
