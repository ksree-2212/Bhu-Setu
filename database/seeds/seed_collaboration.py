import sqlite3
import json

def seed_collaboration():
    conn = sqlite3.connect('data/land_governance.db')
    c = conn.cursor()

    # 1. Clean existing dummy workspaces/items/comments if needed or add new
    # Check existing users
    c.execute("SELECT id, username FROM users")
    users = {r[1]: r[0] for r in c.fetchall()}
    admin_id = users.get('admin', 1)
    researcher_id = users.get('researcher', 2)
    analyst_id = users.get('analyst', 3)
    official_id = users.get('official', 4)
    aditya_id = users.get('aditya', 6)

    # Workspaces to seed
    workspaces = [
        {
            "id": 101,
            "name": "Telangana Peri-Urban LULC & Transit Corridor Taskforce",
            "description": "Cross-sectoral working group analyzing land transition dynamics along the Hyderabad Regional Ring Road (RRR) and Outer Ring Road (ORR) corridors.",
            "owner_id": researcher_id,
            "is_public": 1,
            "members": [
                (researcher_id, "Principal Investigator"),
                (analyst_id, "Policy Analyst"),
                (official_id, "Government Advisor"),
                (aditya_id, "GIS Lead"),
                (admin_id, "Reviewer")
            ],
            "items": [
                ("dataset", 1, "Multi-spectral Sentinel LULC Classification (2018-2026)", {"coverage": "Telangana State", "format": "GeoJSON"}),
                ("document", 1, "National Land Governance Policy Framework (NLGPF-2026)", {"category": "Statutory", "year": 2026}),
                ("scenario", 1, "Rangareddy Urban Expansion & TOD Buffer Zoning Simulation", {"model": "Cellular Automata / CA-Markov", "accuracy": "91.4%"}),
                ("note", 0, "Working Draft: Interim guidelines for agricultural land protection in peri-urban development zones.", {"author": "Priya Venkat"})
            ],
            "comments": [
                (researcher_id, "Welcome team. I have ingested the latest 2026 LULC classified layers for Rangareddy and Medchal-Malkajgiri. Please review the agricultural conversion rates."),
                (analyst_id, "The TOD simulation model indicates that a 500m high-density buffer could preserve up to 14,000 hectares of prime agricultural land by 2035."),
                (official_id, "Revenue department concurs. We are preparing the draft notification under the Telangana Land Revenue Act. Let's incorporate these spatial figures into the brief."),
                (aditya_id, "I updated the change detection heatmaps. High-risk fragmentation clusters are now marked in red in the shared GIS layers.")
            ]
        },
        {
            "id": 102,
            "name": "SVAMITVA Drone Cadastre & Rural Property Rights Consortium",
            "description": "Consortium assessing high-resolution UAV drone cadastre data, boundary reconciliation with legacy revenue maps, and digital property card issuance.",
            "owner_id": official_id,
            "is_public": 1,
            "members": [
                (official_id, "Project Director"),
                (researcher_id, "Survey Methodologist"),
                (aditya_id, "Cadastral Specialist"),
                (admin_id, "Audit Supervisor")
            ],
            "items": [
                ("dataset", 2, "SVAMITVA Large Scale Cadastral Drone Parcel Survey", {"accuracy": "5cm GSD", "villages_covered": 420}),
                ("document", 2, "Decentralized Cadastral Mapping for Rural Land Rights in India", {"journal": "Land Use Policy", "citations": 34}),
                ("note", 0, "Standard Operating Procedure (SOP) for ground-truthing dispute resolution with Gram Sabhas.", {"status": "APPROVED"})
            ],
            "comments": [
                (official_id, "Orthomosaic processing for Nizamabad pilot villages completed. Ready for boundary dispute resolution analysis."),
                (researcher_id, "The boundary reconciliation algorithm showed a 98.2% concordance with physical boundaries on ground."),
                (aditya_id, "All parcel boundaries have been verified against the SHA-256 cryptographic provenance ledger.")
            ]
        },
        {
            "id": 103,
            "name": "Western Ghats & Coastal Eco-Sensitive Land Governance",
            "description": "Inter-state environmental policy cell monitoring forest encroachment, catchment degradation, and statutory coastal regulation zone (CRZ) compliances.",
            "owner_id": analyst_id,
            "is_public": 1,
            "members": [
                (analyst_id, "Lead Policy Analyst"),
                (researcher_id, "Ecological Modeler"),
                (admin_id, "Compliance Officer")
            ],
            "items": [
                ("dataset", 3, "Eco-Sensitive Area (ESA) Catchment Encroachment Alerts", {"frequency": "Bi-weekly Sentinel", "cloud_cover": "<5%"}),
                ("document", 3, "AI-Driven Geospatial Land Suitability Assessment", {"doi": "10.1016/j.landusepol.2025.106890"})
            ],
            "comments": [
                (analyst_id, "Sentinel alerts detected 3 illegal quarrying attempts in the buffer zone. Forwarded spatial coordinates to the district collectorate."),
                (researcher_id, "Land suitability scores updated. Steep slope areas (>25 degrees) marked strictly non-convertible.")
            ]
        }
    ]

    for ws in workspaces:
        # Check if workspace already exists
        c.execute("SELECT id FROM workspaces WHERE id = ?", (ws["id"],))
        existing = c.fetchone()
        if existing:
            c.execute("UPDATE workspaces SET name=?, description=?, owner_id=?, is_public=1 WHERE id=?", 
                      (ws["name"], ws["description"], ws["owner_id"], ws["id"]))
        else:
            c.execute("INSERT INTO workspaces (id, name, description, owner_id, is_public) VALUES (?, ?, ?, ?, ?)",
                      (ws["id"], ws["name"], ws["description"], ws["owner_id"], ws["is_public"]))

        # Members
        for uid, role in ws["members"]:
            c.execute("INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)",
                      (ws["id"], uid, role))

        # Items
        c.execute("DELETE FROM workspace_items WHERE workspace_id = ?", (ws["id"],))
        for it_type, it_id, notes, it_data in ws["items"]:
            c.execute("INSERT INTO workspace_items (workspace_id, item_type, item_id, item_data_json, notes) VALUES (?, ?, ?, ?, ?)",
                      (ws["id"], it_type, it_id, json.dumps(it_data), notes))

        # Comments
        c.execute("DELETE FROM workspace_comments WHERE workspace_id = ?", (ws["id"],))
        for uid, text in ws["comments"]:
            c.execute("INSERT INTO workspace_comments (workspace_id, user_id, comment_text) VALUES (?, ?, ?)",
                      (ws["id"], uid, text))

    # Also seed innovation submissions
    submissions = [
        {
            "initiative_id": 1,
            "submitter_id": researcher_id,
            "title": "Bhu-Drishti: Edge-AI Drone Cadastre Boundary Segmentation",
            "proposal_text": "An ultra-lightweight YOLOv10-based aerial boundary segmentation pipeline deployable on edge UAV devices for real-time parcel boundary detection during SVAMITVA village flights."
        },
        {
            "initiative_id": 1,
            "submitter_id": aditya_id,
            "title": "Geo-Provenance: Zero-Knowledge Verification for Land Title Registry",
            "proposal_text": "Cryptographic zk-SNARK proof system verifying land deed succession and spatial parcel integrity without exposing sensitive farmer owner identities to public nodes."
        },
        {
            "initiative_id": 2,
            "submitter_id": analyst_id,
            "title": "Multi-Temporal Sentinel-2 Deep Change Vector Analysis for Encroachment Detection",
            "proposal_text": "Automated bi-weekly pipeline processing Sentinel-2 spectral indices (NDVI, NDBI, MNDWI) using recurrent U-Net architectures to trigger instant SMS alerts to revenue tahsildars upon unauthorized wetland conversions."
        }
    ]

    for sub in submissions:
        c.execute("SELECT id FROM innovation_submissions WHERE title = ?", (sub["title"],))
        if not c.fetchone():
            c.execute("INSERT INTO innovation_submissions (initiative_id, submitter_id, title, proposal_text) VALUES (?, ?, ?, ?)",
                      (sub["initiative_id"], sub["submitter_id"], sub["title"], sub["proposal_text"]))

    conn.commit()
    conn.close()
    print("Collaboration workspaces, members, items, comments, and hackathon submissions successfully seeded!")

if __name__ == "__main__":
    seed_collaboration()
