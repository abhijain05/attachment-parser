import {
  users,
  projects,
  documents,
  documentChunks,
  documentEmbeddings,
  chatbotConfigs,
  chatSessions,
  chatMessages,
  analyticsEvents,
  visitorSessions,
  liveChatMessages,
  adminSettings,
  userModelAssignments,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Document,
  type InsertDocument,
  type DocumentChunk,
  type DocumentEmbedding,
  type InsertDocumentEmbedding,
  type ChatbotConfig,
  type InsertChatbotConfig,
  type ChatSession,
  type ChatMessage,
  type AnalyticsEvent,
  type VisitorSession,
  type InsertVisitorSession,
  type LiveChatMessage,
  type InsertLiveChatMessage,
  type AdminSettings,
  type InsertAdminSettings,
  type UserModelAssignment,
  type InsertUserModelAssignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Document operations
  getDocuments(projectId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocumentStatus(id: string, status: string, content?: string): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  
  // Document chunks operations
  createChunks(chunks: { documentId: string; content: string; chunkIndex: number }[]): Promise<void>;
  searchChunks(projectId: string, query: string, limit?: number): Promise<(DocumentChunk & { documentName: string })[]>;
  
  // Chatbot config operations
  getChatbotConfig(projectId: string): Promise<ChatbotConfig | undefined>;
  upsertChatbotConfig(projectId: string, config: Partial<InsertChatbotConfig>): Promise<ChatbotConfig>;
  
  // Chat session operations
  createChatSession(projectId: string, visitorId?: string): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  deleteChatSession(id: string): Promise<void>;
  addChatMessage(message: { sessionId: string; role: string; content: string; sources?: any; tokensUsed?: number }): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  
  // Analytics operations
  logAnalyticsEvent(event: { projectId: string; eventType: string; metadata?: any }): Promise<void>;
  getAnalytics(projectId: string, days?: number): Promise<{
    totalQueries: number;
    tokensUsed: number;
    answeredRate: number;
    topSources: { documentName: string; hitCount: number }[];
    recentQueries: { query: string; answered: boolean; timestamp: string }[];
  }>;
  
  // Stats
  getUserStats(userId: string): Promise<{
    totalProjects: number;
    totalDocuments: number;
    totalQueries: number;
    tokensUsed: number;
  }>;

  // Visitor session operations
  createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession>;
  getVisitorSession(id: string): Promise<VisitorSession | undefined>;
  getProjectVisitors(projectId: string): Promise<VisitorSession[]>;
  updateVisitorSession(id: string, updates: Partial<VisitorSession>): Promise<void>;

  // Live chat operations
  addLiveChatMessage(message: InsertLiveChatMessage): Promise<LiveChatMessage>;
  getLiveChatMessages(visitorSessionId: string): Promise<LiveChatMessage[]>;
  getProjectLiveChats(projectId: string): Promise<{
    visitorSession: VisitorSession;
    messages: LiveChatMessage[];
  }[]>;

  // Document embeddings operations
  createDocumentEmbeddings(embeddings: InsertDocumentEmbedding[]): Promise<void>;
  getDocumentEmbeddings(userId: string, documentId: string): Promise<DocumentEmbedding[]>;

  // Admin settings operations
  getAdminSettings(): Promise<AdminSettings | undefined>;
  upsertAdminSettings(data: Partial<InsertAdminSettings>): Promise<void>;

  // User model assignment operations
  getUserModelAssignment(userId: string): Promise<UserModelAssignment | undefined>;
  upsertUserModelAssignment(userId: string, data: Partial<InsertUserModelAssignment>): Promise<UserModelAssignment>;
  getAllUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async getProjects(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Document operations
  async getDocuments(projectId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async updateDocumentStatus(id: string, status: string, content?: string): Promise<void> {
    const updateData: Partial<Document> = { status, updatedAt: new Date() };
    if (content !== undefined) {
      updateData.content = content;
    }
    await db.update(documents).set(updateData).where(eq(documents.id, id));
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Document chunks operations
  async createChunks(chunks: { documentId: string; content: string; chunkIndex: number; embedding?: number[] }[]): Promise<void> {
    if (chunks.length === 0) return;
    await db.insert(documentChunks).values(chunks);
  }

  async searchChunks(projectId: string, query: string, limit = 5, queryEmbedding?: number[]): Promise<(DocumentChunk & { documentName: string; similarity?: number })[]> {
    // Fetch all chunks for the project
    const allChunks = await db
      .select({
        id: documentChunks.id,
        documentId: documentChunks.documentId,
        content: documentChunks.content,
        embedding: documentChunks.embedding,
        chunkIndex: documentChunks.chunkIndex,
        metadata: documentChunks.metadata,
        createdAt: documentChunks.createdAt,
        documentName: documents.name,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.status, "ready")
        )
      );

    if (allChunks.length === 0) return [];

    // If we have query embedding, use semantic search
    if (queryEmbedding && queryEmbedding.length > 0) {
      const cosineSimilarity = (a: number[], b: number[]): number => {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return magA && magB ? dotProduct / (magA * magB) : 0;
      };

      const scored = allChunks.map(chunk => ({
        ...chunk,
        similarity: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0,
      }));
      
      return scored.sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, limit);
    }

    // Fallback to keyword search
    const queryLower = query.toLowerCase();
    return allChunks
      .filter(chunk => chunk.content.toLowerCase().includes(queryLower))
      .slice(0, limit);
  }

  // Chatbot config operations
  async getChatbotConfig(projectId: string): Promise<ChatbotConfig | undefined> {
    const [config] = await db.select().from(chatbotConfigs).where(eq(chatbotConfigs.projectId, projectId));
    return config;
  }

  async upsertChatbotConfig(projectId: string, config: Partial<InsertChatbotConfig>): Promise<ChatbotConfig> {
    const existing = await this.getChatbotConfig(projectId);
    if (existing) {
      const [updated] = await db
        .update(chatbotConfigs)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(chatbotConfigs.projectId, projectId))
        .returning();
      return updated;
    }
    const [newConfig] = await db
      .insert(chatbotConfigs)
      .values({ projectId, ...config })
      .returning();
    return newConfig;
  }

  // Chat session operations
  async createChatSession(projectId: string, visitorId?: string): Promise<ChatSession> {
    const [session] = await db.insert(chatSessions).values({ projectId, visitorId }).returning();
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session;
  }

  async deleteChatSession(id: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
  }

  async addChatMessage(message: { sessionId: string; role: string; content: string; sources?: any; tokensUsed?: number; attachments?: any }): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(message).returning();
    return msg;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.createdAt);
  }

  // Analytics operations
  async logAnalyticsEvent(event: { projectId: string; eventType: string; metadata?: any }): Promise<void> {
    await db.insert(analyticsEvents).values(event);
  }

  async getAnalytics(projectId: string, days = 7): Promise<{
    totalQueries: number;
    tokensUsed: number;
    answeredRate: number;
    topSources: { documentName: string; hitCount: number }[];
    recentQueries: { query: string; answered: boolean; timestamp: string }[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.projectId, projectId),
          sql`${analyticsEvents.createdAt} >= ${since}`
        )
      )
      .orderBy(desc(analyticsEvents.createdAt));

    const queryEvents = events.filter((e) => e.eventType === "query");
    const totalQueries = queryEvents.length;
    const tokensUsed = queryEvents.reduce((sum, e) => sum + ((e.metadata as any)?.tokensUsed || 0), 0);
    const answeredCount = queryEvents.filter((e) => (e.metadata as any)?.answered).length;
    const answeredRate = totalQueries > 0 ? Math.round((answeredCount / totalQueries) * 100) : 0;

    // Get top sources
    const sourceHits: Record<string, number> = {};
    for (const event of queryEvents) {
      const docIds = (event.metadata as any)?.sourceDocIds || [];
      for (const docId of docIds) {
        sourceHits[docId] = (sourceHits[docId] || 0) + 1;
      }
    }
    const docs = await db.select().from(documents).where(eq(documents.projectId, projectId));
    const docMap = new Map(docs.map((d) => [d.id, d.name]));
    const topSources = Object.entries(sourceHits)
      .map(([docId, hitCount]) => ({ documentName: docMap.get(docId) || docId, hitCount }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 5);

    // Recent queries
    const recentQueries = queryEvents.slice(0, 10).map((e) => ({
      query: (e.metadata as any)?.query || "",
      answered: (e.metadata as any)?.answered || false,
      timestamp: e.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return { totalQueries, tokensUsed, answeredRate, topSources, recentQueries };
  }

  // Stats
  async getUserStats(userId: string): Promise<{
    totalProjects: number;
    totalDocuments: number;
    totalQueries: number;
    tokensUsed: number;
  }> {
    const userProjects = await this.getProjects(userId);
    const projectIds = userProjects.map((p) => p.id);

    let totalDocuments = 0;
    let totalQueries = 0;
    let tokensUsed = 0;

    for (const projectId of projectIds) {
      const docs = await this.getDocuments(projectId);
      totalDocuments += docs.length;

      const analytics = await this.getAnalytics(projectId, 30);
      totalQueries += analytics.totalQueries;
      tokensUsed += analytics.tokensUsed;
    }

    return {
      totalProjects: userProjects.length,
      totalDocuments,
      totalQueries,
      tokensUsed,
    };
  }

  // Visitor session operations
  async createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession> {
    const [newSession] = await db.insert(visitorSessions).values(session).returning();
    return newSession;
  }

  async getVisitorSession(id: string): Promise<VisitorSession | undefined> {
    const [session] = await db.select().from(visitorSessions).where(eq(visitorSessions.id, id));
    return session;
  }

  async getProjectVisitors(projectId: string): Promise<VisitorSession[]> {
    return db.select().from(visitorSessions).where(eq(visitorSessions.projectId, projectId)).orderBy(desc(visitorSessions.updatedAt));
  }

  async updateVisitorSession(id: string, updates: Partial<VisitorSession>): Promise<void> {
    await db.update(visitorSessions).set({ ...updates, updatedAt: new Date() }).where(eq(visitorSessions.id, id));
  }

  // Live chat operations
  async addLiveChatMessage(message: InsertLiveChatMessage): Promise<LiveChatMessage> {
    const [msg] = await db.insert(liveChatMessages).values(message).returning();
    return msg;
  }

  async getLiveChatMessages(visitorSessionId: string): Promise<LiveChatMessage[]> {
    return db.select().from(liveChatMessages).where(eq(liveChatMessages.visitorSessionId, visitorSessionId)).orderBy(liveChatMessages.createdAt);
  }

  async getProjectLiveChats(projectId: string): Promise<{ visitorSession: VisitorSession; messages: LiveChatMessage[] }[]> {
    const sessions = await db.select().from(visitorSessions).where(eq(visitorSessions.projectId, projectId));
    const result = [];
    for (const session of sessions) {
      const messages = await this.getLiveChatMessages(session.id);
      result.push({ visitorSession: session, messages });
    }
    return result;
  }

  // Document embeddings operations
  async createDocumentEmbeddings(embeddings: InsertDocumentEmbedding[]): Promise<void> {
    if (embeddings.length === 0) return;
    await db.insert(documentEmbeddings).values(embeddings);
  }

  async getDocumentEmbeddings(userId: string, documentId: string): Promise<DocumentEmbedding[]> {
    return db.select().from(documentEmbeddings).where(and(eq(documentEmbeddings.userId, userId), eq(documentEmbeddings.documentId, documentId))).orderBy(documentEmbeddings.chunkIndex);
  }

  // Admin settings operations
  async getAdminSettings() {
    const [settings] = await db.select().from(adminSettings).limit(1);
    return settings;
  }

  async upsertAdminSettings(data: any) {
    const existing = await this.getAdminSettings();
    if (existing) {
      await db.update(adminSettings).set(data).where(eq(adminSettings.id, existing.id));
    } else {
      await db.insert(adminSettings).values(data);
    }
  }

  // User model assignment operations
  async getUserModelAssignment(userId: string): Promise<UserModelAssignment | undefined> {
    const [assignment] = await db.select().from(userModelAssignments).where(eq(userModelAssignments.userId, userId));
    return assignment;
  }

  async upsertUserModelAssignment(userId: string, data: any): Promise<UserModelAssignment> {
    const existing = await this.getUserModelAssignment(userId);
    if (existing) {
      await db.update(userModelAssignments).set(data).where(eq(userModelAssignments.userId, userId));
      const [updated] = await db.select().from(userModelAssignments).where(eq(userModelAssignments.userId, userId));
      return updated;
    } else {
      const [newAssignment] = await db.insert(userModelAssignments).values({ userId, ...data }).returning();
      return newAssignment;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
}

export const storage = new DatabaseStorage();
