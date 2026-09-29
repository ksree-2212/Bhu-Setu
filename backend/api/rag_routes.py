from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ai.rag.pipeline import rag_pipeline

router = APIRouter(prefix="/api/rag", tags=["Grounded RAG Research Assistant"])

class RAGQueryRequest(BaseModel):
    query: str
    category: Optional[str] = None
    state: Optional[str] = None
    top_k: Optional[int] = 5

@router.post("/query")
def execute_rag(req: RAGQueryRequest):
    response = rag_pipeline.answer_query(
        query=req.query,
        category=req.category,
        state=req.state,
        top_k=req.top_k or 5
    )
    
    # Store cryptographic provenance of the AI claim synthesis
    if response.get("has_sufficient_evidence"):
        from backend.services.provenance_service import provenance_service
        import json
        
        # We record the exact claims generated from the retrieved citations
        provenance_service.record_event(
            action="AI_CLAIM_SYNTHESIS",
            entity_type="RAG_QUERY",
            entity_id=hash(req.query) % 10000000, # deterministic stub ID
            actor_id=1, # Default user (System/AI)
            payload={
                "query": req.query,
                "citations_used": [c["citation_id"] for c in response.get("citations", [])],
                "confidence_score": response.get("confidence_score")
            }
        )
        
    # Normalize citations so all clients have consistent field names
    raw_citations = response.get("citations", [])
    normalized_citations = [
        {
            **c,
            "title": c.get("document_title") or c.get("title", "Statutory Source"),
            "document_title": c.get("document_title") or c.get("title", "Statutory Source"),
            "score": float(c.get("relevance_score") if c.get("relevance_score") is not None else (c.get("score") if c.get("score") is not None else 0.85)),
            "relevance_score": float(c.get("relevance_score") if c.get("relevance_score") is not None else (c.get("score") if c.get("score") is not None else 0.85)),
            "snippet": c.get("verbatim_excerpt") or c.get("snippet", ""),
            "verbatim_excerpt": c.get("verbatim_excerpt") or c.get("snippet", "")
        }
        for c in raw_citations
    ]
    response["citations"] = normalized_citations
    answer_text = response.get("answer", "")

    return {
        "status": "SUCCESS",
        "data": response,
        "answer": answer_text,
        "citations": normalized_citations,
        "confidence_score": response.get("confidence_score", 0.0),
        "claims": response.get("claims", [])
    }

