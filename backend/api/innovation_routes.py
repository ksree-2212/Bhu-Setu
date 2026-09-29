from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.database.manager import db_manager
from backend.auth.rbac import get_current_user, require_roles

router = APIRouter(prefix="/api/innovation", tags=["Innovation Portal"])

class InitiativeCreate(BaseModel):
    title: str
    type: str
    description: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class SubmissionCreate(BaseModel):
    title: str
    proposal_text: str

def get_acting_user(current_user: Optional[dict] = Depends(get_current_user)) -> dict:
    if current_user:
        return current_user
    user = db_manager.execute_one("SELECT id, username, email, full_name, role FROM users WHERE role = 'Researcher' OR id = 1 LIMIT 1")
    if user:
        return user
    return {"id": 1, "username": "admin", "full_name": "Dr. Rajesh Sharma", "role": "Administrator"}

@router.get("/initiatives")
def list_initiatives():
    initiatives = db_manager.execute_query(
        """SELECT i.*, 
                  (SELECT COUNT(*) FROM innovation_submissions s WHERE s.initiative_id = i.id) as submission_count 
           FROM innovation_initiatives i 
           ORDER BY i.created_at DESC"""
    )
    return {"status": "SUCCESS", "initiatives": initiatives}

@router.post("/initiatives")
def create_initiative(req: InitiativeCreate, current_user: dict = Depends(require_roles(["Administrator", "Government Official"]))):
    initiative_id = db_manager.execute_insert(
        """INSERT INTO innovation_initiatives (title, type, description, start_date, end_date, creator_id) 
           VALUES (?, ?, ?, ?, ?, ?)""",
        (req.title, req.type, req.description, req.start_date, req.end_date, current_user["id"])
    )
    return {"status": "SUCCESS", "initiative_id": initiative_id}

@router.get("/initiatives/{initiative_id}/submissions")
def list_submissions(initiative_id: int):
    submissions = db_manager.execute_query(
        """SELECT s.*, u.full_name as submitter_name, u.organization, u.role as submitter_role
           FROM innovation_submissions s
           JOIN users u ON s.submitter_id = u.id
           WHERE s.initiative_id = ? ORDER BY s.submitted_at DESC""",
        (initiative_id,)
    )
    return {"status": "SUCCESS", "submissions": submissions}

@router.post("/initiatives/{initiative_id}/submissions")
def submit_proposal(initiative_id: int, req: SubmissionCreate, current_user: dict = Depends(get_acting_user)):
    initiative = db_manager.execute_one("SELECT * FROM innovation_initiatives WHERE id = ?", (initiative_id,))
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
        
    submission_id = db_manager.execute_insert(
        """INSERT INTO innovation_submissions (initiative_id, submitter_id, title, proposal_text) 
           VALUES (?, ?, ?, ?)""",
        (initiative_id, current_user["id"], req.title, req.proposal_text)
    )
    new_sub = db_manager.execute_one(
        """SELECT s.*, u.full_name as submitter_name, u.organization 
           FROM innovation_submissions s
           JOIN users u ON s.submitter_id = u.id
           WHERE s.id = ?""",
        (submission_id,)
    )
    return {"status": "SUCCESS", "submission": new_sub, "submission_id": submission_id}
