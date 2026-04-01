"""
Vedic Astrology SaaS — FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

from routers.chart import router as chart_router

app = FastAPI(
    title="Vedic Astrology API",
    description="Calculates Vedic (Jyotish) birth charts using Swiss Ephemeris",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow Next.js dev server and production domain
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chart_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vedic-astrology-api"}


@app.get("/")
async def root():
    return {
        "message": "Vedic Astrology API",
        "docs": "/docs",
        "version": "1.0.0",
    }
