-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents uploaded to the Marketing Brain
CREATE TABLE IF NOT EXISTS brain_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  file_type   TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Text chunks with embeddings (voyage-3 = 1024 dimensions)
CREATE TABLE IF NOT EXISTS brain_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES brain_documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding   vector(1024),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
