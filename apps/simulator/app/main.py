import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, simulate
from app.queue import get_redis, is_redis_enabled

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    r = get_redis()
    if is_redis_enabled():
        print("Redis connected successfully")
    else:
        print("Redis not available, running in offline mode (inline execution only)")
    yield


app = FastAPI(title="QVANTA Simulator", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(simulate.router)


@app.get("/")
async def root():
    return {
        "name": "QVANTA Simulator",
        "version": "0.1.0",
        "docs": "/docs",
        "redis_enabled": is_redis_enabled(),
    }
