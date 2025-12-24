ALTER TABLE "chat_messages" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "chatbot_configs" ADD COLUMN "openai_model" varchar(100) DEFAULT 'gpt-4o';--> statement-breakpoint
ALTER TABLE "chatbot_configs" ADD COLUMN "gemini_model" varchar(100) DEFAULT 'gemini-2.0-flash';