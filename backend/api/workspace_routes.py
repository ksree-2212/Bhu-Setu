from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from backend.services.workspace_service import workspace_service
from backend.auth.rbac import get_current_user
from backend.database.manager import db_manager

router = APIRouter(prefix="/api/workspaces", tags=["Research Workspaces"])

class CreateWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    is_public: Optional[bool] = False

class AddItemRequest(BaseModel):
    item_type: str # document, dataset, query, scenario, note
    item_id: Optional[int] = 0
    notes: Optional[str] = ""
    item_data: Optional[Dict[str, Any]] = None

class AddMemberRequest(BaseModel):
    identifier: str # user_id, email, or username
    role: Optional[str] = "Contributor" # Co-Investigator, GIS Analyst, Reviewer, Contributor

class AddCommentRequest(BaseModel):
    comment_text: str

def get_acting_user(current_user: Optional[dict] = Depends(get_current_user)) -> dict:
    if current_user:
        return current_user
    # Fallback to default active researcher or administrator for seamless collaboration preview
    user = db_manager.execute_one("SELECT id, username, email, full_name, role FROM users WHERE role = 'Researcher' OR id = 1 LIMIT 1")
    if user:
        return user
    return {"id": 1, "username": "admin", "full_name": "Dr. Rajesh Sharma", "role": "Administrator"}

@router.get("")
@router.get("/")
def list_workspaces(current_user: dict = Depends(get_acting_user)):
    workspaces = workspace_service.list_workspaces(user_id=current_user["id"])
    return {"status": "SUCCESS", "workspaces": workspaces}

@router.post("")
@router.post("/")
def create_workspace(req: CreateWorkspaceRequest, current_user: dict = Depends(get_acting_user)):
    res = workspace_service.create_workspace(
        name=req.name,
        description=req.description,
        owner_id=current_user["id"],
        is_public=req.is_public
    )
    return {"status": "SUCCESS", "workspace": res}

@router.get("/{ws_id}")
def get_workspace(ws_id: int, current_user: dict = Depends(get_acting_user)):
    ws = workspace_service.get_workspace(ws_id, current_user["id"])
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"status": "SUCCESS", "workspace": ws}

@router.delete("/{ws_id}")
def delete_workspace(ws_id: int, current_user: dict = Depends(get_acting_user)):
    success = workspace_service.delete_workspace(ws_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized to delete this workspace")
    return {"status": "SUCCESS", "message": "Workspace deleted"}

@router.get("/{ws_id}/candidates")
def list_candidates(ws_id: int, current_user: dict = Depends(get_acting_user)):
    candidates = workspace_service.list_candidates(ws_id)
    return {"status": "SUCCESS", "candidates": candidates}

@router.post("/{ws_id}/members")
def add_member(ws_id: int, req: AddMemberRequest, current_user: dict = Depends(get_acting_user)):
    member = workspace_service.add_member(ws_id, req.identifier, req.role or "Contributor")
    if not member:
        raise HTTPException(status_code=404, detail="User not found with provided identifier")
    return {"status": "SUCCESS", "member": member}

@router.get("/{ws_id}/comments")
def list_comments(ws_id: int, current_user: dict = Depends(get_acting_user)):
    ws = workspace_service.get_workspace(ws_id, current_user["id"])
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"status": "SUCCESS", "comments": ws.get("comments", [])}

@router.post("/{ws_id}/comments")
def add_comment(ws_id: int, req: AddCommentRequest, current_user: dict = Depends(get_acting_user)):
    if not req.comment_text or not req.comment_text.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    comment = workspace_service.add_comment(ws_id, current_user["id"], req.comment_text)
    return {"status": "SUCCESS", "comment": comment}

@router.post("/{ws_id}/items")
def add_item_to_workspace(ws_id: int, req: AddItemRequest, current_user: dict = Depends(get_acting_user)):
    item_id = workspace_service.add_item(
        workspace_id=ws_id,
        item_type=req.item_type,
        item_id=req.item_id or 0,
        notes=req.notes,
        item_data=req.item_data
    )
    return {"status": "SUCCESS", "item_id": item_id}

@router.delete("/{ws_id}/items/{item_id}")
def delete_item_from_workspace(ws_id: int, item_id: int, current_user: dict = Depends(get_acting_user)):
    workspace_service.delete_item(ws_id, item_id)
    return {"status": "SUCCESS", "message": "Item removed from workspace"}
