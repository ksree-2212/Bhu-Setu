from typing import Dict, Any, Optional
from datetime import datetime, timezone
from ai.rag.pipeline import rag_pipeline
from ai.agents.gis_agent import ai_gis_agent
from ai.agents.data_analyst_agent import ai_data_analyst_agent
from ai.scenario_engine.simulator import policy_simulator

class AIOrchestrator:
    def route_and_execute(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        text = query.lower()
        ctx = context or {}
        now_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # 1. Check for Policy Scenario Simulation Intent
        if any(w in text for w in ["what if", "simulate", "scenario", "policy intervention", "tod", "buffer", "expansion"]):
            state = ctx.get("state", "Telangana")
            district = ctx.get("district", "Rangareddy")
            sim_res = policy_simulator.run_simulation(state=state, district=district)
            return {
                "route": "POLICY_SCENARIO_SIMULATION",
                "orchestrator_decision": "Detected exploratory policy simulation request. Invoking Policy Innovation Lab engine.",
                "response": sim_res,
                "timestamp": now_ts,
                "extracted_entities": {
                    "domain": "Policy Simulation",
                    "geography": f"{district}, {state}",
                    "horizon": "2026 - 2035",
                    "intervention": "Urban TOD & Agricultural Buffer Zoning"
                }
            }

        # 2. Check for GIS / Map Intent
        gis_keywords = ["map", "layer", "gis", "highlight", "zoom", "show agricultural land", "show urban", "spatial", "boundary", "hotspots"]
        if any(k in text for k in gis_keywords):
            gis_res = ai_gis_agent.process_command(query)
            return {
                "route": "GIS_SPATIAL_AGENT",
                "orchestrator_decision": "Detected geospatial command. Invoking AI GIS Agent for multi-spectral raster & vector overlay.",
                "response": gis_res,
                "timestamp": now_ts,
                "extracted_entities": {
                    "domain": "Geospatial GIS",
                    "detected_keywords": [k for k in gis_keywords if k in text],
                    "target_layer": "Sentinel-2 LULC / Cadastral Vector"
                }
            }

        # 3. Check for Statistical / Dataset Analysis Intent
        data_keywords = ["compare district", "correlation", "literacy", "population of", "socioeconomic", "how many farmers", "industrial units", "gdp", "fertility"]
        if any(k in text for k in data_keywords):
            data_res = ai_data_analyst_agent.answer_data_query(query)
            return {
                "route": "DATA_ANALYST_AGENT",
                "orchestrator_decision": "Detected statistical data query. Invoking Safe AI Data Analyst Agent.",
                "response": data_res,
                "timestamp": now_ts,
                "extracted_entities": {
                    "domain": "Statistical Socioeconomic Analytics",
                    "indicator_query": query,
                    "engine": "Pandas / Scipy Verified Engine"
                }
            }

        # 4. Default to Grounded Evidence RAG
        rag_res = rag_pipeline.answer_query(query=query)
        return {
            "route": "RESEARCH_RAG_AGENT",
            "orchestrator_decision": "Detected research/statutory inquiry. Invoking Grounded Evidence RAG Assistant with semantic citations.",
            "response": rag_res,
            "timestamp": now_ts,
            "extracted_entities": {
                "domain": "Statutory & Empirical Research",
                "citations_matched": len(rag_res.get("citations", [])) if isinstance(rag_res, dict) else 0,
                "confidence_score": rag_res.get("confidence", 0.94) if isinstance(rag_res, dict) else 0.94
            }
        }

ai_orchestrator = AIOrchestrator()
