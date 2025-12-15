-- Initialize pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for vector similarity search (adjust dimensions as needed)
-- Example: CREATE INDEX ON your_table USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Show vector version
SELECT vector_version();
