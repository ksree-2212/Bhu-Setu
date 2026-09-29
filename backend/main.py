from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
import time

from backend.core.config import settings
from backend.api import (
    auth_routes,
    document_routes,
    dataset_routes,
    search_routes,
    rag_routes,
    gis_routes,
    analytics_routes,
    scenario_routes,
    workspace_routes,
    provenance_routes,
    report_routes,
    admin_routes,
    ai_routes,
    innovation_routes,
    integration_routes,
    notification_routes
)

app = FastAPI(
    title="National Digital Platform for Land Governance (SIH26019)",
    description=(
        "Production-ready digital public infrastructure for land governance research, "
        "evidence discovery, policy innovation, GIS satellite intelligence, and cryptographic provenance."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Request Timing & Security Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register Domain Routers
app.include_router(auth_routes.router)
app.include_router(document_routes.router)
app.include_router(dataset_routes.router)
app.include_router(search_routes.router)
app.include_router(rag_routes.router)
app.include_router(gis_routes.router)
app.include_router(analytics_routes.router)
app.include_router(scenario_routes.router)
app.include_router(workspace_routes.router)
app.include_router(provenance_routes.router)
app.include_router(report_routes.router)
app.include_router(admin_routes.router)
app.include_router(ai_routes.router)
app.include_router(innovation_routes.router)
app.include_router(integration_routes.router)

# Mount Static Files
static_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
assets_dir = static_dir / "assets"
assets_dir.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

# Health Checks
@app.get("/health", tags=["Health & Observability"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.get("/health/ready", tags=["Health & Observability"])
def readiness_check():
    from backend.database.manager import db_manager
    try:
        db_manager.execute_one("SELECT 1")
        return {"status": "READY", "database": "CONNECTED"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "UNREADY", "error": str(e)})

@app.get("/health/live", tags=["Health & Observability"])
def liveness_check():
    return {"status": "LIVE"}

# Serve Single Page Government Portal UI
@app.get("/{full_path:path}", response_class=HTMLResponse, tags=["Frontend Portal"])
def serve_portal(full_path: str):
    # Pass API requests to next handlers
    if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"]:
        return JSONResponse(status_code=404, content={"message": "Not Found"})
        
    template_path = Path(__file__).resolve().parent.parent / "frontend" / "dist" / "index.html"
    if template_path.exists():
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>National Digital Platform for Land Governance — SIH26019</h1><p>Frontend is currently building...</p>"
