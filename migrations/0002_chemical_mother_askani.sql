ALTER TABLE "document_embeddings" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "document_embeddings" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chatbot_configs" ADD COLUMN "tarang_ai_url" text;--> statement-breakpoint
ALTER TABLE "chatbot_configs" ADD COLUMN "tarang_ai_api_key" text;--> statement-breakpoint
ALTER TABLE "chatbot_configs" ADD COLUMN "tarang_ai_model" varchar(100);