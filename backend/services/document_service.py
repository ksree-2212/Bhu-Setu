import hashlib
import json
from typing import List, Dict, Any, Optional
from backend.database.manager import db_manager
from ai.search.hybrid_index import search_index
from backend.services.provenance_service import provenance_service
from backend.services.audit_service import audit_service

class DocumentService:
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 80) -> List[str]:
        words = text.split()
        if not words:
            return []
        chunks = []
        start = 0
        while start < len(words):
            end = min(len(words), start + chunk_size)
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            if end == len(words):
                break
            start += (chunk_size - overlap)
        return chunks

    def add_document(
        self,
        title: str,
        content: str,
        category: str,
        author: Optional[str] = "DoLR / Academic Partner",
        organization: Optional[str] = "Ministry of Rural Development",
        publication_date: Optional[str] = "2026",
        state: Optional[str] = "National",
        district: Optional[str] = "All",
        keywords: Optional[str] = "",
        document_type: Optional[str] = "Research Paper",
        uploader_id: int = 1,
        verification_status: str = "VERIFIED"
    ) -> Dict[str, Any]:
        file_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        
        doc_id = db_manager.execute_insert(
            """INSERT INTO documents 
            (title, description, author, organization, publication_date, category, state, district, keywords, source, document_type, uploader_id, verification_status, file_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                title, content[:300] + "...", author, organization, publication_date,
                category, state, district, keywords, organization, document_type,
                uploader_id, verification_status, file_hash
            )
        )

        chunks = self.chunk_text(content)
        for idx, chunk in enumerate(chunks):
            db_manager.execute_insert(
                """INSERT INTO document_chunks (document_id, chunk_index, content, token_count)
                VALUES (?, ?, ?, ?)""",
                (doc_id, idx, chunk, len(chunk.split()))
            )
            # Index chunk into hybrid search
            search_index.index_document(
                doc_id=doc_id * 1000 + idx,
                text=f"{title}\n{chunk}",
                metadata={
                    "document_id": doc_id,
                    "chunk_index": idx,
                    "title": title,
                    "category": category,
                    "author": author,
                    "organization": organization,
                    "publication_date": publication_date,
                    "state": state,
                    "district": district,
                    "keywords": keywords,
                    "verification_status": verification_status
                }
            )

        # Record cryptographic provenance
        provenance_service.record_event(
            entity_type="document",
            entity_id=doc_id,
            action="INGESTION_AND_INDEXING",
            actor_id=uploader_id,
            payload={"title": title, "category": category, "file_hash": file_hash, "chunks_count": len(chunks)}
        )

        # Audit log
        audit_service.log(
            action="DOCUMENT_UPLOAD",
            resource=f"document:{doc_id}",
            actor_id=uploader_id,
            metadata={"title": title, "category": category}
        )

        return {
            "id": doc_id,
            "title": title,
            "category": category,
            "chunks_count": len(chunks),
            "file_hash": file_hash,
            "verification_status": verification_status
        }

    def list_documents(
        self,
        category: Optional[str] = None,
        state: Optional[str] = None,
        verification_status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        conditions = []
        params = []
        if category and category.lower() != "all":
            conditions.append("category = ?")
            params.append(category)
        if state and state.lower() != "all":
            conditions.append("state = ?")
            params.append(state)
        if verification_status and verification_status.lower() != "all":
            conditions.append("verification_status = ?")
            params.append(verification_status)
        
        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = f"SELECT * FROM documents {where_clause} ORDER BY id DESC LIMIT ?"
        params.append(limit)
        return db_manager.execute_query(query, tuple(params))

    def get_document(self, doc_id: int) -> Optional[Dict[str, Any]]:
        doc = db_manager.execute_one("SELECT * FROM documents WHERE id = ?", (doc_id,))
        if not doc:
            return None
        chunks = db_manager.execute_query(
            "SELECT chunk_index, content FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC",
            (doc_id,)
        )
        doc["chunks"] = chunks
        return doc

    def save_document(self, user_id: int, doc_id: int) -> bool:
        existing = db_manager.execute_one(
            "SELECT id FROM saved_research WHERE user_id = ? AND document_id = ?",
            (user_id, doc_id)
        )
        if not existing:
            db_manager.execute_insert(
                "INSERT INTO saved_research (user_id, document_id) VALUES (?, ?)",
                (user_id, doc_id)
            )
            return True
        return False

    def unsave_document(self, user_id: int, doc_id: int) -> bool:
        db_manager.execute_update(
            "DELETE FROM saved_research WHERE user_id = ? AND document_id = ?",
            (user_id, doc_id)
        )
        return True

    def list_saved_documents(self, user_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT d.*, sr.saved_at
            FROM documents d
            JOIN saved_research sr ON d.id = sr.document_id
            WHERE sr.user_id = ?
            ORDER BY sr.saved_at DESC
        """
        return db_manager.execute_query(query, (user_id,))

    def get_saved_document_ids(self, user_id: int) -> List[int]:
        rows = db_manager.execute_query(
            "SELECT document_id FROM saved_research WHERE user_id = ?",
            (user_id,)
        )
        return [r["document_id"] for r in rows]

document_service = DocumentService()

