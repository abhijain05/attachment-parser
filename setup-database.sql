CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar NOT NULL UNIQUE,
    "password" varchar,
    "first_name" varchar,
    "last_name" varchar,
    "profile_image_url" varchar,
    "auth_provider" varchar(20) DEFAULT 'email',
    "google_id" varchar UNIQUE,
    "email_verified" boolean DEFAULT false,
    "verification_token" varchar,
    "verification_expires" timestamp,
    "reset_token" varchar,
    "reset_expires" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "projects" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id"),
    "name" text NOT NULL,
    "description" text,
    "mcp_api_key" varchar DEFAULT gen_random_uuid(),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "documents" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "type" varchar(50) NOT NULL,
    "content" text,
    "metadata" jsonb,
    "status" varchar(20) DEFAULT 'processing',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "document_id" varchar NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "chunk_index" integer NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "visitor_id" varchar,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" varchar NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
    "role" varchar(20) NOT NULL,
    "content" text NOT NULL,
    "sources" jsonb,
    "tokens_used" integer,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chatbot_configs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" varchar NOT NULL UNIQUE REFERENCES "projects"("id") ON DELETE CASCADE,
    "primary_color" varchar(20) DEFAULT '#3B82F6',
    "background_color" varchar(20) DEFAULT '#FFFFFF',
    "text_color" varchar(20) DEFAULT '#1F2937',
    "position" varchar(20) DEFAULT 'bottom-right',
    "welcome_message" text DEFAULT 'Hello! How can I help you today?',
    "bot_name" varchar(100) DEFAULT 'AI Assistant',
    "tone" varchar(50) DEFAULT 'professional',
    "show_sources" boolean DEFAULT true,
    "ai_provider" varchar(20) DEFAULT 'openai',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "event_type" varchar(50) NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "sid" varchar PRIMARY KEY NOT NULL,
    "sess" jsonb NOT NULL,
    "expire" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");

INSERT INTO "users" ("email", "password", "auth_provider", "first_name", "last_name", "email_verified") 
VALUES 
  ('admin@tarang.dev', '$2b$10$WYqjO/glZ4ZSJdQnip39be.tkOctAyMKpZ8MmngFLCkPwB/HfkFza', 'email', 'Admin', 'User', true),
  ('demo@tarang.dev', '$2b$10$bIu2ZVUxbIuQ0T6y36Z1TOn8gQxGEFrGifuiSHPrxaRA3rnw3uEIi', 'email', 'Demo', 'User', true)
ON CONFLICT DO NOTHING;
