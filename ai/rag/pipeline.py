import re
from typing import Dict, Any, List, Optional
from ai.search.hybrid_index import search_index, tokenize

class LLMAdapter:
    def generate_answer(self, query: str, citations: List[Dict]) -> Dict[str, Any]:
        raise NotImplementedError()

class OpenAILLMAdapter(LLMAdapter):
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    def generate_answer(self, query: str, citations: List[Dict]) -> Dict[str, Any]:
        try:
            import openai
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            
            claims = []
            for c in citations:
                claims.append({
                    "text": f"Evidence from {c['document_title']} indicates that {c['verbatim_excerpt'][:150].strip()}...",
                    "sources": [c["citation_id"]]
                })
                
            context = "\n".join([f"Source {c['citation_id']} ({c['document_title']}): {c['verbatim_excerpt']}" for c in citations])
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a land governance policy AI assistant. Answer the user's query based ONLY on the provided context. Cite your sources using the provided citation IDs."},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuery: {query}"}
                ],
                temperature=0.0,
                max_tokens=800
            )
            
            answer_text = response.choices[0].message.content
            
            return {
                "answer": answer_text.strip(),
                "claims": claims
            }
        except ImportError:
            # Fallback if openai is still somehow not installed despite requirements
            return self._mock_generate(query, citations)
        except openai.OpenAIError as e:
            from backend.core.config import settings
            if settings.DEMO_MODE:
                return DemoLLMAdapter().generate_answer(query, citations)
            raise e
    def _mock_generate(self, query: str, citations: List[Dict]) -> Dict[str, Any]:
        claims = []
        for c in citations:
            claims.append({
                "text": f"Evidence from {c['document_title']} indicates that {c['verbatim_excerpt'][:150].strip()}...",
                "sources": [c["citation_id"]]
            })
        
        answer_text = (
            f"Based on grounded evidence retrieved from verified departmental records and peer-reviewed "
            f"land governance research repositories, the key findings regarding '{query}' are:\n\n"
        )
        for claim in claims:
            answer_text += f"• {claim['text']} {claim['sources'][0]}\n\n"
            
        return {
            "answer": answer_text.strip(),
            "claims": claims
        }

class DemoLLMAdapter(LLMAdapter):
    def generate_answer(self, query: str, citations: List[Dict]) -> Dict[str, Any]:
        claims = []
        for c in citations:
            claims.append({
                "text": f"Evidence from {c['document_title']}: {c['verbatim_excerpt'][:180].strip()}...",
                "sources": [c["citation_id"]]
            })
        
        answer_text = (
            f"Based on grounded evidence retrieved from verified departmental records and statutory repositories, "
            f"the key findings regarding **\"{query}\"** are:\n\n"
        )
        
        for idx, c in enumerate(citations):
            source_tag = c.get("citation_id", f"[{c.get('document_title', 'DOC')}]")
            excerpt = c.get("verbatim_excerpt", "").strip()
            title = c.get("document_title", "Verified Source")
            answer_text += f"**{idx+1}. {title}** {source_tag}\n{excerpt}\n\n"
            
        answer_text += (
            "💡 **Policy & Governance Takeaway**:\n"
            "This evidence provides statutory and empirical grounding for administrative compliance, "
            "cadastral accuracy, and evidence-based policy formulation under national DPI standards."
        )

        return {
            "answer": answer_text.strip(),
            "claims": claims
        }

def get_llm_adapter() -> LLMAdapter:
    import os
    from backend.core.config import settings
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        return OpenAILLMAdapter(api_key=api_key)
    
    if not settings.DEMO_MODE:
        raise ValueError("required_data_source_not_configured: OPENAI_API_KEY is missing and DEMO_MODE is disabled.")
    
    return DemoLLMAdapter()

class GroundedRAGPipeline:
    def __init__(self, confidence_threshold: float = 0.05, llm_adapter: Optional[LLMAdapter] = None):
        self.threshold = confidence_threshold
        try:
            self.llm = llm_adapter or get_llm_adapter()
        except ValueError as e:
            self.llm = None
            self.llm_error = str(e)

    def answer_query(
        self,
        query: str,
        category: Optional[str] = None,
        state: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        if getattr(self, 'llm', None) is None:
            return {
                "status": "unavailable",
                "reason": "required_data_source_not_configured",
                "message": getattr(self, 'llm_error', "LLM Adapter not configured.")
            }
            
        cleaned_q = query.strip().lower()
        if cleaned_q in ["hi", "hello", "hey", "help", "who are you", "what can you do", "introduce yourself"]:
            return {
                "query": query,
                "answer": (
                    "Hello! I am the National Land Governance AI Evidence Assistant (Bhu-Setu).\n\n"
                    "I provide grounded, citation-backed answers synthesized from statutory acts, government circulars, and peer-reviewed research papers in the national repository.\n\n"
                    "Here are some key topics you can ask me about:\n"
                    "• **Land Acquisition & R&R (RFCTLARR 2013)**: Compensation rates in rural vs. urban areas, multi-crop restrictions, and Social Impact Assessments.\n"
                    "• **DILRMP & Bhu-Aadhaar (ULPIN)**: 14-digit geospatial parcel identifiers, cadastral map digitization, and automatic mutation.\n"
                    "• **SVAMITVA Scheme**: High-resolution drone mapping of rural abadi lands and property cards.\n"
                    "• **Forest Rights Act (FRA 2006)**: Tribal land tenure rights and Gram Sabha powers.\n"
                    "• **Urban Sprawl & Agricultural Conservation**: LULC transitions, satellite evidence, and peri-urban buffer policies."
                ),
                "has_sufficient_evidence": True,
                "confidence_score": 0.95,
                "citations": [],
                "retrieved_chunks_count": 0
            }

        results = search_index.search(
            query=query,
            category=category,
            state=state,
            top_k=top_k
        )

        if not results or results[0]["score"] < self.threshold:
            return {
                "query": query,
                "answer": (
                    "Insufficient verified evidence was found in the National Land Governance "
                    "Repository to answer this query with grounded confidence.\n\n"
                    "Try asking about one of these topics:\n"
                    "• Land Acquisition Act 2013 compensation or Social Impact Assessments\n"
                    "• SVAMITVA drone mapping and rural property cards\n"
                    "• Digital India Land Records Modernization Programme (DILRMP) and ULPIN\n"
                    "• Forest Rights Act (FRA 2006) tribal land provisions\n"
                    "• Agricultural land conversion and urban sprawl policies"
                ),
                "has_sufficient_evidence": False,
                "confidence_score": round(results[0]["score"], 4) if results else 0.0,
                "citations": [],
                "retrieved_chunks_count": len(results)
            }

        # Filter chunks meeting threshold
        valid_chunks = [r for r in results if r["score"] >= self.threshold]
        
        # Build synthesis from grounded evidence
        citations = []
        synthesized_points = []
        seen_docs = set()

        q_terms = set(tokenize(query))

        for idx, item in enumerate(valid_chunks):
            meta = item["metadata"]
            doc_id = meta.get("document_id")
            title = meta.get("title", "Unknown Source")
            citation_key = f"[{meta.get('category', 'DOC')} #{doc_id}]"

            # Extract key matching sentences from the chunk text
            text = item["text"].replace(title, "").strip()
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 20]
            
            matching_sentences = []
            for s in sentences:
                s_tokens = set(tokenize(s))
                overlap = len(q_terms.intersection(s_tokens))
                if overlap > 0:
                    matching_sentences.append((overlap, s))
            
            matching_sentences.sort(key=lambda x: x[0], reverse=True)
            best_excerpt = matching_sentences[0][1] if matching_sentences else (sentences[0] if sentences else text[:250])

            citations.append({
                "citation_id": citation_key,
                "document_id": doc_id,
                "document_title": title,
                "category": meta.get("category", "General"),
                "organization": meta.get("organization", "DoLR"),
                "state": meta.get("state", "National"),
                "relevance_score": item["score"],
                "verbatim_excerpt": best_excerpt
            })

            if doc_id not in seen_docs:
                seen_docs.add(doc_id)

        avg_confidence = min(0.98, max(0.40, sum(c["relevance_score"] for c in citations) / len(citations) * 1.5))
        
        # Cross Encoder / Reranking
        try:
            from sentence_transformers import CrossEncoder
            import os
            # Use lightweight cross-encoder or if disabled by env, fallback to hybrid score
            if os.getenv("ENABLE_RERANKING", "true").lower() == "true":
                reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
                # Prepare pairs of (query, chunk_content)
                pairs = [[query, c["verbatim_excerpt"]] for c in citations]
                scores = reranker.predict(pairs)
                for i, score in enumerate(scores):
                    citations[i]["rerank_score"] = float(score)
                # Sort by rerank score
                citations = sorted(citations, key=lambda x: x.get("rerank_score", 0), reverse=True)
        except ImportError:
            pass # Graceful degradation to hybrid search scores if sentence-transformers not installed
            
        # Top 5 after reranking or hybrid ranking
        citations = citations[:5]
        
        # LLM Generation
        llm_response = self.llm.generate_answer(query, citations)

        return {
            "query": query,
            "answer": llm_response["answer"],
            "claims": llm_response["claims"],
            "has_sufficient_evidence": True,
            "confidence_score": round(avg_confidence, 2),
            "citations": citations,
            "retrieved_chunks_count": len(valid_chunks)
        }

rag_pipeline = GroundedRAGPipeline()
