-- Create implementations table
CREATE TABLE IF NOT EXISTS implementations (
    id SERIAL PRIMARY KEY,
    sl_no INTEGER UNIQUE NOT NULL,
    organisation_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    project_name TEXT NOT NULL,
    for_type TEXT NOT NULL,
    website TEXT,
    state TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_implementations_state ON implementations(state);
CREATE INDEX IF NOT EXISTS idx_implementations_sector ON implementations(sector);
