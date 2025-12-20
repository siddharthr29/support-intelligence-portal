-- Create share_links table for public shareable map links
CREATE TABLE IF NOT EXISTS share_links (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at);
