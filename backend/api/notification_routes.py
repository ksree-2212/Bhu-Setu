from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from backend.database.manager import db_manager
from backend.auth.rbac import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

class NotificationCreate(BaseModel):
    category: str # RESEARCH, POLICY, DATASET, GIS, INNOVATION
    title: str
    description: str
    user_id: Optional[int] = None

@router.get("")
@router.get("/")
def list_notifications(current_user: Optional[dict] = Depends(get_current_user)):
    user_id = current_user["id"] if current_user else None
    
    if user_id:
        rows = db_manager.execute_query(
            """SELECT id, category, title, description, 
                      CASE WHEN is_read = 1 THEN 1 ELSE 0 END as is_read, 
                      created_at as timestamp 
               FROM notifications 
               WHERE user_id IS NULL OR user_id = ? 
               ORDER BY created_at DESC""",
            (user_id,)
        )
    else:
        rows = db_manager.execute_query(
            """SELECT id, category, title, description, 
                      CASE WHEN is_read = 1 THEN 1 ELSE 0 END as is_read, 
                      created_at as timestamp 
               FROM notifications 
               ORDER BY created_at DESC"""
        )

    # Format for frontend compatibility
    notifs = []
    unread_count = 0
    for r in rows:
        is_read_bool = bool(r.get("is_read", 0))
        if not is_read_bool:
            unread_count += 1
        notifs.append({
            "id": str(r["id"]),
            "category": r["category"].upper(),
            "title": r["title"],
            "description": r["description"],
            "read": is_read_bool,
            "timestamp": r["timestamp"],
            "time": r["timestamp"]
        })

    return {
        "status": "SUCCESS",
        "notifications": notifs,
        "unread_count": unread_count
    }

@router.post("")
@router.post("/")
def create_notification(req: NotificationCreate, current_user: Optional[dict] = Depends(get_current_user)):
    notif_id = f"notif_{uuid.uuid4().hex[:8]}"
    uid = req.user_id or (current_user["id"] if current_user else None)
    
    db_manager.execute_insert(
        """INSERT INTO notifications (id, user_id, category, title, description, is_read) 
           VALUES (?, ?, ?, ?, ?, 0)""",
        (notif_id, uid, req.category.upper(), req.title, req.description)
    )
    
    return {
        "status": "SUCCESS",
        "notification": {
            "id": notif_id,
            "category": req.category.upper(),
            "title": req.title,
            "description": req.description,
            "read": False
        }
    }

@router.post("/{notif_id}/read")
def mark_notification_read(notif_id: str, current_user: Optional[dict] = Depends(get_current_user)):
    db_manager.execute_insert(
        "UPDATE notifications SET is_read = 1 WHERE id = ?",
        (notif_id,)
    )
    return {"status": "SUCCESS", "message": "Notification marked as read"}

@router.post("/mark-all-read")
def mark_all_read(current_user: Optional[dict] = Depends(get_current_user)):
    user_id = current_user["id"] if current_user else None
    if user_id:
        db_manager.execute_insert(
            "UPDATE notifications SET is_read = 1 WHERE user_id IS NULL OR user_id = ?",
            (user_id,)
        )
    else:
        db_manager.execute_insert("UPDATE notifications SET is_read = 1")
    return {"status": "SUCCESS", "message": "All notifications marked as read"}

@router.delete("/{notif_id}")
def delete_notification(notif_id: str):
    db_manager.execute_query(
        "DELETE FROM notifications WHERE id = ?",
        (notif_id,)
    )
    return {"status": "SUCCESS", "message": "Notification deleted"}

@router.delete("")
@router.delete("/")
def clear_all_notifications(current_user: Optional[dict] = Depends(get_current_user)):
    user_id = current_user["id"] if current_user else None
    if user_id:
        db_manager.execute_query(
            "DELETE FROM notifications WHERE user_id = ?",
            (user_id,)
        )
    else:
        db_manager.execute_query("DELETE FROM notifications")
    return {"status": "SUCCESS", "message": "All notifications cleared"}
