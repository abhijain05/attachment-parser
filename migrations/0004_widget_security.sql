-- Add security features for widget embedding
-- 1. Add allowed_domains field to chatbot_configs for domain allow-listing
-- 2. Create migration for token-based authentication

ALTER TABLE chatbot_configs
ADD COLUMN allowed_domains jsonb DEFAULT '[]'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN chatbot_configs.allowed_domains IS 'Array of allowed domains for CORS and widget embedding (e.g., ["example.com", "*.example.com", "localhost"])';

-- Create an index for faster lookups if needed
CREATE INDEX idx_chatbot_config_project_id ON chatbot_configs(project_id);
