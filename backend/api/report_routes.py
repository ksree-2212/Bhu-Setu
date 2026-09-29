from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.services.report_service import report_service
from backend.auth.rbac import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Evidence Policy Reports"])

class GenerateReportRequest(BaseModel):
    region: Optional[str] = "Telangana (Hyderabad Peri-Urban)"
    topic: Optional[str] = "Agricultural Land Conversion & Peri-Urban Sprawl Mitigation"

@router.get("")
@router.get("/")
def list_reports():
    reports = report_service.list_reports()
    return {"status": "SUCCESS", "count": len(reports), "reports": reports}

@router.post("/generate")
def generate_report(req: GenerateReportRequest, current_user: Optional[dict] = Depends(get_current_user)):
    user_name = current_user['full_name'] if current_user else "Dr. Rajesh Sharma"
    user_org = current_user.get('organization', 'DoLR') if current_user else "Ministry of Rural Development"
    user_id = current_user['id'] if current_user else 1

    report = report_service.generate_policy_brief(
        region=req.region or "Telangana (Hyderabad Peri-Urban)",
        topic=req.topic or "Agricultural Land Conversion & Peri-Urban Sprawl Mitigation",
        author=f"{user_name} ({user_org})",
        actor_id=user_id
    )
    return {"status": "SUCCESS", "report": report}

