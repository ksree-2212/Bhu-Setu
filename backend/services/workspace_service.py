import json
from typing import Dict, Any, List, Optional
from backend.database.manager import db_manager
from backend.services.audit_service import audit_service

class WorkspaceService:
    def create_workspace(self, name: str, description: str, owner_id: int, is_public: bool = False) -> Dict[str, Any]:
        ws_id = db_manager.execute_insert(
            "INSERT INTO workspaces (name, description, owner_id, is_public) VALUES (?, ?, ?, ?)",
            (name, description, owner_id, 1 if is_public else 0)
        )
        db_manager.execute_insert(
            "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)",
            (ws_id, owner_id, "Owner")
        )
        audit_service.log("WORKSPACE_CREATE", f"workspace:{ws_id}", actor_id=owner_id, metadata={"name": name})
        return {"id": ws_id, "name": name, "description": description, "owner_id": owner_id, "is_public": is_public}

    def list_workspaces(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        uid = user_id or 0
        workspaces = db_manager.execute_query(
            """SELECT w.id, w.name, w.description, w.owner_id, w.is_public, w.created_at,
                      u.full_name as owner_name, u.email as owner_email,
                      (SELECT role FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = ?) as member_role,
                      (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count,
                      (SELECT COUNT(*) FROM workspace_items wi WHERE wi.workspace_id = w.id) as item_count,
                      (SELECT COUNT(*) FROM workspace_comments wc WHERE wc.workspace_id = w.id) as comment_count
               FROM workspaces w
               LEFT JOIN users u ON w.owner_id = u.id
               WHERE w.is_public = 1 
                  OR w.owner_id = ?
                  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = ?)
               ORDER BY w.created_at DESC""",
            (uid, uid, uid)
        )
        return workspaces

    def get_workspace(self, workspace_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        ws = db_manager.execute_one(
            """SELECT w.*, u.full_name as owner_name, u.email as owner_email
               FROM workspaces w
               LEFT JOIN users u ON w.owner_id = u.id
               WHERE w.id = ?""",
            (workspace_id,)
        )
        if not ws:
            return None

        members = db_manager.execute_query(
            """SELECT u.id, u.username, u.full_name, u.email, u.role as platform_role, wm.role, wm.joined_at 
               FROM workspace_members wm 
               JOIN users u ON wm.user_id = u.id 
               WHERE wm.workspace_id = ?
               ORDER BY wm.joined_at ASC""",
            (workspace_id,)
        )
        
        raw_items = db_manager.execute_query(
            "SELECT * FROM workspace_items WHERE workspace_id = ? ORDER BY added_at DESC",
            (workspace_id,)
        )
        items = []
        for it in raw_items:
            item_dict = dict(it)
            try:
                item_dict["item_data"] = json.loads(item_dict.get("item_data_json") or "{}")
            except Exception:
                item_dict["item_data"] = {}
            items.append(item_dict)

        comments = db_manager.execute_query(
            """SELECT wc.id, wc.workspace_id, wc.user_id, wc.comment_text, wc.created_at,
                      u.full_name as author_name, u.username as author_username, u.role as author_role
               FROM workspace_comments wc
               JOIN users u ON wc.user_id = u.id
               WHERE wc.workspace_id = ?
               ORDER BY wc.created_at ASC""",
            (workspace_id,)
        )

        ws["members"] = members
        ws["items"] = items
        ws["comments"] = comments
        return ws

    def add_member(self, workspace_id: int, identifier: Any, role: str = "Contributor") -> Optional[Dict[str, Any]]:
        user = None
        if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
            user = db_manager.execute_one("SELECT * FROM users WHERE id = ?", (int(identifier),))
        elif isinstance(identifier, str):
            user = db_manager.execute_one(
                "SELECT * FROM users WHERE email = ? OR username = ? OR full_name LIKE ?",
                (identifier.strip(), identifier.strip(), f"%{identifier.strip()}%")
            )
        
        if not user:
            return None

        # Check if already member
        existing = db_manager.execute_one(
            "SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            (workspace_id, user["id"])
        )
        if existing:
            db_manager.execute_insert(
                "UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?",
                (role, workspace_id, user["id"])
            )
        else:
            db_manager.execute_insert(
                "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)",
                (workspace_id, user["id"], role)
            )

        return {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": role
        }

    def list_candidates(self, workspace_id: int) -> List[Dict[str, Any]]:
        return db_manager.execute_query(
            """SELECT id, username, full_name, email, role, organization 
               FROM users 
               WHERE id NOT IN (SELECT user_id FROM workspace_members WHERE workspace_id = ?)
               ORDER BY full_name ASC""",
            (workspace_id,)
        )

    def add_comment(self, workspace_id: int, user_id: int, comment_text: str) -> Dict[str, Any]:
        comment_id = db_manager.execute_insert(
            "INSERT INTO workspace_comments (workspace_id, user_id, comment_text) VALUES (?, ?, ?)",
            (workspace_id, user_id, comment_text.strip())
        )
        user = db_manager.execute_one("SELECT id, username, full_name, role FROM users WHERE id = ?", (user_id,))
        audit_service.log("WORKSPACE_COMMENT", f"workspace:{workspace_id}", actor_id=user_id)
        return {
            "id": comment_id,
            "workspace_id": workspace_id,
            "user_id": user_id,
            "comment_text": comment_text.strip(),
            "author_name": user["full_name"] if user else "Researcher",
            "author_username": user["username"] if user else "researcher",
            "author_role": user["role"] if user else "Contributor",
        }

    def add_item(self, workspace_id: int, item_type: str, item_id: int, notes: str = "", item_data: Dict[str, Any] = None) -> int:
        data_json = json.dumps(item_data or {})
        return db_manager.execute_insert(
            "INSERT INTO workspace_items (workspace_id, item_type, item_id, item_data_json, notes) VALUES (?, ?, ?, ?, ?)",
            (workspace_id, item_type, item_id, data_json, notes)
        )

    def delete_item(self, workspace_id: int, item_id: int) -> bool:
        db_manager.execute_query(
            "DELETE FROM workspace_items WHERE id = ? AND workspace_id = ?",
            (item_id, workspace_id)
        )
        return True

    def delete_workspace(self, workspace_id: int, user_id: int) -> bool:
        ws = db_manager.execute_one("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        if not ws:
            return False
        user = db_manager.execute_one("SELECT role FROM users WHERE id = ?", (user_id,))
        is_admin = user and user.get("role") == "Administrator"
        if ws["owner_id"] != user_id and not is_admin:
            return False
        
        db_manager.execute_query("DELETE FROM workspaces WHERE id = ?", (workspace_id,))
        db_manager.execute_query("DELETE FROM workspace_members WHERE workspace_id = ?", (workspace_id,))
        db_manager.execute_query("DELETE FROM workspace_items WHERE workspace_id = ?", (workspace_id,))
        db_manager.execute_query("DELETE FROM workspace_comments WHERE workspace_id = ?", (workspace_id,))
        return True

workspace_service = WorkspaceService()
