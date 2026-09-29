-- =============================================================================
-- SIH26019 National Digital Platform for Land Governance Database Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Researcher', -- Public, Researcher, Academic, Policy Analyst, Official, Admin
    organization TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    author TEXT,
    organization TEXT,
    publication_date TEXT,
    category TEXT NOT NULL, -- Act/Rule, Policy Brief, Research Paper, Government Report, Case Study
    state TEXT,
    district TEXT,
    keywords TEXT,
    source TEXT,
    document_type TEXT, -- PDF, Report, Statutory Act, Analysis
    license TEXT DEFAULT 'Government Open Data License - India',
    version TEXT DEFAULT '1.0',
    uploader_id INTEGER,
    verification_status TEXT DEFAULT 'VERIFIED', -- PENDING, VERIFIED, REJECTED
    file_path TEXT,
    file_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(uploader_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_state ON documents(state);
CREATE INDEX IF NOT EXISTS idx_documents_verification ON documents(verification_status);

CREATE TABLE IF NOT EXISTS document_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    vector_json TEXT,
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id);

CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL,
    geographic_coverage TEXT, -- National, State, District
    temporal_coverage TEXT,   -- e.g. 2015-2026
    format TEXT NOT NULL,      -- GeoJSON, CSV, Shapefile, NetCDF
    size_bytes INTEGER DEFAULT 0,
    update_frequency TEXT,     -- Annual, Bi-annual, Real-time
    license TEXT DEFAULT 'Open Government Data (OGD) Platform India',
    metadata_json TEXT,
    provenance_hash TEXT,
    is_verified INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gis_layers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer_name TEXT NOT NULL,
    layer_type TEXT NOT NULL, -- administrative, lulc, ndvi, infrastructure, socioeconomic
    state TEXT,
    district TEXT,
    year INTEGER NOT NULL,
    geojson_data TEXT NOT NULL,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gis_layers_type_year ON gis_layers(layer_type, year);
CREATE INDEX IF NOT EXISTS idx_gis_layers_state ON gis_layers(state);

CREATE TABLE IF NOT EXISTS socioeconomic_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    year INTEGER NOT NULL,
    population INTEGER,
    urban_pop_pct REAL,
    literacy_rate REAL,
    agri_workers_pct REAL,
    forest_cover_sqkm REAL,
    crop_intensity_pct REAL,
    avg_landholding_ha REAL,
    industrial_units INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state, district, year)
);

CREATE INDEX IF NOT EXISTS idx_socio_state_district ON socioeconomic_indicators(state, district);

CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    is_public INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'Contributor',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    item_type TEXT NOT NULL, -- document, dataset, query, scenario, note
    item_id INTEGER,
    item_data_json TEXT,
    notes TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER,
    creator_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    baseline_year INTEGER NOT NULL,
    target_year INTEGER NOT NULL,
    parameters_json TEXT NOT NULL,
    results_json TEXT NOT NULL,
    provenance_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY(creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS provenance_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_index INTEGER NOT NULL,
    prev_hash TEXT NOT NULL,
    current_hash TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- dataset, document, scenario, transformation
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,      -- INGESTION, TRANSFORMATION, SIMULATION, VERIFICATION
    actor_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    signature TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provenance_hash ON provenance_ledger(current_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER,
    actor_email TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    result TEXT NOT NULL, -- SUCCESS, FAILURE, DENIED
    ip_address TEXT,
    metadata_json TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

CREATE TABLE IF NOT EXISTS innovation_initiatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'OPEN',
    start_date TEXT,
    end_date TEXT,
    creator_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS innovation_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    initiative_id INTEGER NOT NULL,
    submitter_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    proposal_text TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    evaluation_score REAL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(initiative_id) REFERENCES innovation_initiatives(id),
    FOREIGN KEY(submitter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS saved_research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_research_user ON saved_research(user_id);

CREATE TABLE IF NOT EXISTS policy_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    region TEXT NOT NULL,
    author TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    doc_hash TEXT NOT NULL,
    report_data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    category TEXT NOT NULL, -- RESEARCH, POLICY, DATASET, GIS, INNOVATION
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);



