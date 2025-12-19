import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with email/password and OAuth support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // null for OAuth users
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  authProvider: varchar("auth_provider", { length: 20 }).default("email"), // email, google
  googleId: varchar("google_id").unique(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: varchar("verification_token"),
  verificationExpires: timestamp("verification_expires"),
  resetToken: varchar("reset_token"),
  resetExpires: timestamp("reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Insert schema for user registration
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
  verificationToken: true,
  verificationExpires: true,
  resetToken: true,
  resetExpires: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;

// Projects table - each user can have multiple knowledge projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  mcpApiKey: varchar("mcp_api_key").default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  documents: many(documents),
  chatbotConfig: one(chatbotConfigs),
  chatSessions: many(chatSessions),
  analyticsEvents: many(analyticsEvents),
}));

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  mcpApiKey: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Documents table - knowledge sources
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // pdf, txt, md, url
  content: text("content"), // raw text content
  metadata: jsonb("metadata").$type<{ size?: number; url?: string; mimeType?: string }>(),
  status: varchar("status", { length: 20 }).default("processing"), // processing, ready, error
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  chunks: many(documentChunks),
}));

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Document chunks for RAG
export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  embedding: jsonb("embedding").$type<number[]>(), // OpenAI embedding vector
  metadata: jsonb("metadata").$type<{ startChar?: number; endChar?: number }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export type DocumentChunk = typeof documentChunks.$inferSelect;

// Chatbot configuration per project
export const chatbotConfigs = pgTable("chatbot_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  primaryColor: varchar("primary_color", { length: 20 }).default("#3B82F6"),
  backgroundColor: varchar("background_color", { length: 20 }).default("#FFFFFF"),
  textColor: varchar("text_color", { length: 20 }).default("#1F2937"),
  position: varchar("position", { length: 20 }).default("bottom-right"), // bottom-right, bottom-left
  welcomeMessage: text("welcome_message").default("Hello! How can I help you today?"),
  botName: varchar("bot_name", { length: 100 }).default("AI Assistant"),
  tone: varchar("tone", { length: 50 }).default("professional"), // professional, friendly, formal
  showSources: boolean("show_sources").default(true),
  aiProvider: varchar("ai_provider", { length: 20 }).default("openai"), // openai, gemini
  openaiApiKey: text("openai_api_key"), // user's own API key
  geminiApiKey: text("gemini_api_key"), // user's own API key
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatbotConfigsRelations = relations(chatbotConfigs, ({ one }) => ({
  project: one(projects, {
    fields: [chatbotConfigs.projectId],
    references: [projects.id],
  }),
}));

export const insertChatbotConfigSchema = createInsertSchema(chatbotConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChatbotConfig = z.infer<typeof insertChatbotConfigSchema>;
export type ChatbotConfig = typeof chatbotConfigs.$inferSelect;

// Chat sessions
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  visitorId: varchar("visitor_id"), // optional identifier for website visitors
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  project: one(projects, {
    fields: [chatSessions.projectId],
    references: [projects.id],
  }),
  messages: many(chatMessages),
}));

export type ChatSession = typeof chatSessions.$inferSelect;

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant
  content: text("content").notNull(),
  sources: jsonb("sources").$type<{ documentId: string; chunkId: string; snippet: string }[]>(),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;

// Analytics events
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // query, unanswered, source_hit
  metadata: jsonb("metadata").$type<{ 
    query?: string; 
    tokensUsed?: number; 
    sourceDocIds?: string[];
    answered?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  project: one(projects, {
    fields: [analyticsEvents.projectId],
    references: [projects.id],
  }),
}));

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// Visitor sessions for tracking website visitors
export const visitorSessions = pgTable("visitor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull(), // Unique session ID for each visitor
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  chatMode: varchar("chat_mode", { length: 20 }).default("ai"), // ai, live, waiting
  visitorName: varchar("visitor_name"),
  visitorEmail: varchar("visitor_email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visitorSessionsRelations = relations(visitorSessions, ({ one, many }) => ({
  project: one(projects, {
    fields: [visitorSessions.projectId],
    references: [projects.id],
  }),
  liveChats: many(liveChatMessages),
}));

export type VisitorSession = typeof visitorSessions.$inferSelect;
export const insertVisitorSessionSchema = createInsertSchema(visitorSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVisitorSession = z.infer<typeof insertVisitorSessionSchema>;

// Live chat messages between owner and visitor
export const liveChatMessages = pgTable("live_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorSessionId: varchar("visitor_session_id").notNull().references(() => visitorSessions.id, { onDelete: "cascade" }),
  sender: varchar("sender", { length: 20 }).notNull(), // owner, visitor
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const liveChatMessagesRelations = relations(liveChatMessages, ({ one }) => ({
  visitorSession: one(visitorSessions, {
    fields: [liveChatMessages.visitorSessionId],
    references: [visitorSessions.id],
  }),
}));

export type LiveChatMessage = typeof liveChatMessages.$inferSelect;
export const insertLiveChatMessageSchema = createInsertSchema(liveChatMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertLiveChatMessage = z.infer<typeof insertLiveChatMessageSchema>;

// API Types for frontend
export const chatRequestSchema = z.object({
  projectId: z.string(),
  sessionId: z.string().optional(),
  message: z.string().min(1),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
  sources: z.array(z.object({
    documentId: z.string(),
    documentName: z.string(),
    snippet: z.string(),
  })).optional(),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;
