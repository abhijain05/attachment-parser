import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { z } from "zod";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfParse from "pdf-parse";
import JSZip from "jszip";
import { Server as SocketIOServer } from "socket.io";

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magA && magB ? dotProduct / (magA * magB) : 0;
}

// Sentence Transformers embedding (local)
let sentenceTransformersPipeline: any = null;

async function getSentenceTransformersEmbedding(text: string, model: string = "all-MiniLM-L6-v2"): Promise<number[]> {
  try {
    if (!sentenceTransformersPipeline) {
      const { pipeline } = await import("@xenova/transformers");
      sentenceTransformersPipeline = await pipeline("feature-extraction", `Xenova/${model}`);
    }
    const embedding = await sentenceTransformersPipeline(text, { pooling: "mean", normalize: true });
    return Array.from(embedding.data);
  } catch (err) {
    console.error("Error with Sentence Transformers embedding:", err);
    return [];
  }
}

// Unified embedding provider interface
async function getEmbedding(
  provider: "openai" | "gemini" | "tarang_ai" | "sentence-transformers",
  text: string,
  config?: {
    openaiClient?: OpenAI;
    geminiClient?: GoogleGenerativeAI;
    tarangAiUrl?: string;
    tarangAiApiKey?: string;
    tarangAiModel?: string;
    sentenceTransformersModel?: string;
  }
): Promise<number[]> {
  try {
    if (provider === "sentence-transformers") {
      return await getSentenceTransformersEmbedding(text, config?.sentenceTransformersModel || "all-MiniLM-L6-v2");
    }

    if (provider === "openai" && (config?.openaiClient || openai)) {
      const client = config?.openaiClient || openai;
      const response = await client!.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return response.data[0].embedding;
    }

    if (provider === "gemini" && (config?.geminiClient || gemini)) {
      const client = config?.geminiClient || gemini;
      const model = client!.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(text);
      const embedding = result.embedding?.values || [];
      return Array.isArray(embedding) ? embedding : [];
    }

    if (provider === "tarang_ai") {
      const tarangAiUrl = config?.tarangAiUrl || process.env.TARANG_AI_URL || "http://31.97.210.209:8001";
      const tarangAiApiKey = config?.tarangAiApiKey || process.env.TARANG_AI_API_KEY;
      const tarangAiModel = config?.tarangAiModel || process.env.TARANG_AI_MODEL || "short";
      
      if (!tarangAiApiKey) {
        console.warn("Tarang AI embedding requested but no API key configured");
        return [];
      }

      const response = await fetch(`${tarangAiUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": tarangAiApiKey,
        },
        body: JSON.stringify({ input: text, model: tarangAiModel }),
      });

      if (!response.ok) {
        console.error(`Tarang AI embedding error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const embedding = data.embedding || data.data?.[0]?.embedding || [];
      return Array.isArray(embedding) ? embedding : [];
    }

    return [];
  } catch (err) {
    console.error(`Error generating ${provider} embedding:`, err);
    return [];
  }
}

// Constants
const CHAT_HISTORY_SUMMARIZE_THRESHOLD = 10; // Summarize when history exceeds 10 messages
const CHAT_HISTORY_KEEP_RECENT = 4; // Keep last 4 recent messages after summarization

// Tarang AI Chat/LLM provider
async function getTarangAIChatResponse(
  prompt: string,
  tarangAiUrl: string,
  tarangAiApiKey: string,
  tarangAiModel: string,
  sessionId: string
): Promise<string> {
  try {
    const response = await fetch(`${tarangAiUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": tarangAiApiKey,
      },
      body: JSON.stringify({
        model: tarangAiModel,
        session_id: sessionId,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error(`[Tarang AI] Chat error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[Tarang AI] Error response: ${errorText}`);
      return "";
    }

    const data = await response.json();
    console.log("[Tarang AI] Response received:", JSON.stringify(data).substring(0, 200));
    
    // Try multiple possible response field names
    let output = data.output || data.result || data.message || data.text || data.response || "";
    
    // If it's an object with nested structure, try to extract
    if (typeof output === "object" && output !== null) {
      output = output.text || output.message || JSON.stringify(output);
    }
    
    const result = String(output).trim();
    console.log(`[Tarang AI] Extracted output length: ${result.length}`);
    return result;
  } catch (err) {
    console.error("[Tarang AI] Error calling chat endpoint:", err);
    return "";
  }
}

// Summarize chat history using AI
async function summarizeChatHistory(
  chatMessages: any[],
  aiProvider: string,
  tarangAiUrl?: string,
  tarangAiApiKey?: string,
  tarangAiModel?: string,
  userOpenai?: OpenAI | null,
  userGemini?: GoogleGenerativeAI | null
): Promise<string> {
  try {
    // Filter out system messages and take all but the last 4 (to summarize)
    const messagesToSummarize = chatMessages.slice(0, -CHAT_HISTORY_KEEP_RECENT);
    const conversationText = messagesToSummarize
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const summaryPrompt = `Please provide a concise summary of the following conversation. Focus on key topics, decisions, and important details discussed:\n\n${conversationText}\n\nProvide the summary in 2-3 sentences.`;

    let summary = "";

    if (aiProvider === "tarang_ai" && tarangAiApiKey && tarangAiModel && tarangAiUrl) {
      console.log("[Chat] Summarizing history with Tarang AI...");
      summary = await getTarangAIChatResponse(summaryPrompt, tarangAiUrl, tarangAiApiKey, tarangAiModel, "summary-" + Date.now());
    } else if (aiProvider === "gemini" && (userGemini || gemini)) {
      console.log("[Chat] Summarizing history with Gemini...");
      const geminiClient = userGemini || gemini;
      const model = geminiClient!.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(summaryPrompt);
      summary = result.response.text() || "";
    } else if (userOpenai || openai) {
      console.log("[Chat] Summarizing history with OpenAI...");
      const openaiClient = userOpenai || openai;
      const response = await openaiClient!.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: summaryPrompt }],
        max_completion_tokens: 256,
      });
      summary = response.choices[0].message.content || "";
    }

    return summary.trim();
  } catch (err) {
    console.error("[Chat] Error summarizing history:", err);
    return "";
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".txt", ".md", ".markdown", ".docx"];
    const ext = "." + file.originalname.split(".").pop()?.toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: PDF, DOCX, TXT, MD"));
    }
  },
});

// Initialize OpenAI client
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Initialize Gemini client
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.user as any)?.id;
}

// Text chunking utility
function chunkText(text: string, maxChunkSize = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks.length ? chunks : [text];
}

// Extract text from DOCX file
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    // DOCX is a ZIP file, extract and parse document.xml
    const zip = new JSZip();
    await zip.loadAsync(buffer);
    
    const xmlFile = zip.file("word/document.xml");
    if (!xmlFile) {
      return "DOCX file has no content";
    }
    
    const xmlContent = await xmlFile.async("text");
    // Extract text between XML tags
    const text = xmlContent
      .replace(/<[^>]+>/g, " ") // Remove XML tags
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    
    return text || "DOCX document (no text content)";
  } catch (err) {
    console.error("Error extracting DOCX:", err);
    return "DOCX document (extraction error)";
  }
}

// Extract text from file
async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  if (ext === "txt" || ext === "md" || ext === "markdown") {
    return buffer.toString("utf-8");
  }
  
  if (ext === "docx") {
    return await extractDocxText(buffer);
  }
  
  if (ext === "pdf") {
    try {
      const data = await pdfParse.default(buffer);
      let text = data.text || "";
      
      if (!text.trim()) {
        console.warn("PDF-parse extracted no text, trying fallback:", filename);
        // Try to extract printable ASCII text from the raw buffer
        const rawText = buffer.toString("latin1");
        text = rawText
          .replace(/[^\x20-\x7E\n\r]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
      
      if (!text.trim()) {
        console.warn("PDF extracted no usable text content:", filename);
        return "PDF document (content could not be extracted)";
      }
      
      // Clean up extracted text - normalize whitespace
      return text
        .split(/\s+/)
        .join(" ")
        .trim();
    } catch (err) {
      console.error("Error parsing PDF:", filename, err);
      return "PDF document (extraction error)";
    }
  }
  
  return "";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Projects CRUD
  app.get("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      // Verify ownership
      const userId = getUserId(req);
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const schema = z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      });
      const data = schema.parse(req.body);
      const project = await storage.createProject({ ...data, userId });
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const userId = getUserId(req);
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Documents CRUD
  app.get("/api/documents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      if (!projectId || typeof projectId !== "string") {
        return res.status(400).json({ message: "projectId required" });
      }
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const documents = await storage.getDocuments(projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents/upload", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const { projectId } = req.body;
      if (!projectId || !req.file) {
        return res.status(400).json({ message: "projectId and file required" });
      }
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const filename = req.file.originalname;
      const ext = filename.split(".").pop()?.toLowerCase() || "txt";
      
      // Create document record
      const doc = await storage.createDocument({
        projectId,
        name: filename,
        type: ext,
        status: "processing",
        metadata: { size: req.file.size, mimeType: req.file.mimetype },
      });

      // Process file asynchronously
      (async () => {
        try {
          const userId = getUserId(req);
          const content = await extractText(req.file!.buffer, filename);
          const chunks = chunkText(content);
          
          if (chunks.length === 0 || !content.trim()) {
            console.error("No content extracted from document:", filename);
            await storage.updateDocumentStatus(doc.id, "error", "Could not extract text from file. Please ensure it's a valid, text-based document.");
            return;
          }
          
          // Get chatbot config to determine embedding provider
          let chatbotConfig;
          try {
            chatbotConfig = await storage.getChatbotConfig(projectId);
          } catch (err) {
            console.warn("Could not load chatbot config, using defaults:", err);
            chatbotConfig = null;
          }
          const embeddingProvider = (chatbotConfig?.aiProvider || "openai") as "openai" | "gemini" | "tarang_ai";
          const userOpenaiKey = chatbotConfig?.openaiApiKey;
          const userGeminiKey = chatbotConfig?.geminiApiKey;
          
          const embeddingConfig = {
            openaiClient: userOpenaiKey ? new OpenAI({ apiKey: userOpenaiKey }) : undefined,
            geminiClient: userGeminiKey ? new GoogleGenerativeAI(userGeminiKey) : undefined,
            tarangAiUrl: chatbotConfig?.tarangAiUrl,
            tarangAiApiKey: chatbotConfig?.tarangAiApiKey,
            tarangAiModel: chatbotConfig?.tarangAiModel,
          };
          
          // Generate embeddings and store in document_embeddings table
          const documentEmbeddings = await Promise.all(
            chunks.map(async (text, index) => {
              const embedding = await getEmbedding(embeddingProvider, text, embeddingConfig);
              return {
                userId,
                documentId: doc.id,
                chunkIndex: index,
                content: text,
                embedding: embedding.length > 0 ? embedding : new Array(768).fill(0), // Default to zero vector if no embedding
                metadata: { provider: embeddingProvider, fileName: filename },
              };
            })
          );
          
          // Store in document_embeddings table
          await storage.createDocumentEmbeddings(documentEmbeddings);
          
          // Also store in document_chunks for backward compatibility
          const chunksWithEmbeddings = documentEmbeddings.map((e) => ({
            documentId: e.documentId,
            content: e.content,
            chunkIndex: e.chunkIndex,
            embedding: e.embedding.slice(0, 1536), // Store in chunks too for compatibility
          }));
          
          await storage.createChunks(chunksWithEmbeddings);
          await storage.updateDocumentStatus(doc.id, "ready", content);
          console.log(`[Document] Successfully processed ${filename}: ${chunks.length} chunks created with ${embeddingProvider} embeddings`);
        } catch (err) {
          console.error("Error processing document:", err);
          await storage.updateDocumentStatus(doc.id, "error", "Error processing document. Please try a different file.");
        }
      })();

      res.status(201).json(doc);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.post("/api/documents/url", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectId: z.string(),
        url: z.string().url(),
      });
      const { projectId, url } = schema.parse(req.body);
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const doc = await storage.createDocument({
        projectId,
        name: new URL(url).hostname + new URL(url).pathname.slice(0, 50),
        type: "url",
        status: "processing",
        metadata: { url },
      });

      // Process URL asynchronously
      (async () => {
        try {
          const response = await fetch(url);
          const html = await response.text();
          // Basic HTML to text extraction
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          
          const chunks = chunkText(text);
          await storage.createChunks(
            chunks.map((content, index) => ({
              documentId: doc.id,
              content,
              chunkIndex: index,
            }))
          );
          
          await storage.updateDocumentStatus(doc.id, "ready", text);
        } catch (err) {
          console.error("Error processing URL:", err);
          await storage.updateDocumentStatus(doc.id, "error");
        }
      })();

      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error adding URL:", error);
      res.status(500).json({ message: "Failed to add URL" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      // Verify ownership via project
      const project = await storage.getProject(doc.projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteDocument(req.params.id);
      res.json({ message: "Document deleted" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Chatbot config
  app.get("/api/chatbot-config/:projectId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const config = await storage.getChatbotConfig(req.params.projectId);
      res.json(config || {
        primaryColor: "#3B82F6",
        backgroundColor: "#FFFFFF",
        textColor: "#1F2937",
        position: "bottom-right",
        welcomeMessage: "Hello! How can I help you today?",
        botName: "AI Assistant",
        tone: "professional",
        showSources: true,
      });
    } catch (error) {
      console.error("Error fetching chatbot config:", error);
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  app.put("/api/chatbot-config/:projectId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const config = await storage.upsertChatbotConfig(req.params.projectId, req.body);
      res.json(config);
    } catch (error) {
      console.error("Error saving chatbot config:", error);
      res.status(500).json({ message: "Failed to save config" });
    }
  });

  // Detect if message needs knowledge base (ask AI to decide)
  async function detectNeedsKnowledgeBase(
    message: string,
    aiProvider: string,
    tarangAiUrl?: string,
    tarangAiApiKey?: string,
    tarangAiModel?: string,
    userOpenai?: OpenAI | null,
    userGemini?: GoogleGenerativeAI | null
  ): Promise<boolean> {
    try {
      const intentPrompt = `Analyze this message and decide: Does it require looking up documents/knowledge base information?
      
Message: "${message}"

Respond with ONLY "yes" or "no".
- "yes" = needs knowledge base lookup (questions about specific topics, documents, skills, experience, etc.)
- "no" = general chat or doesn't need knowledge base (greetings, general conversation, meta questions about the bot)`;

      let decision = "";

      if (aiProvider === "tarang_ai" && tarangAiApiKey && tarangAiModel && tarangAiUrl) {
        decision = await getTarangAIChatResponse(intentPrompt, tarangAiUrl, tarangAiApiKey, tarangAiModel, "intent-" + Date.now());
      } else if (aiProvider === "gemini" && (userGemini || gemini)) {
        const geminiClient = userGemini || gemini;
        const model = geminiClient!.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(intentPrompt);
        decision = result.response.text() || "";
      } else if (userOpenai || openai) {
        const openaiClient = userOpenai || openai;
        const response = await openaiClient!.chat.completions.create({
          model: "gpt-5",
          messages: [{ role: "user", content: intentPrompt }],
          max_completion_tokens: 10,
        });
        decision = response.choices[0].message.content || "";
      }

      const result = decision.toLowerCase().includes("yes");
      console.log(`[Chat] Intent detection: "${message.substring(0, 50)}..." -> needs_knowledge_base: ${result}`);
      return result;
    } catch (err) {
      console.error("[Chat] Error detecting intent:", err);
      // Default to true (search chunks) if detection fails
      return true;
    }
  }

  // Chat / AI endpoint
  app.post("/api/chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectId: z.string(),
        sessionId: z.string().optional(),
        message: z.string().min(1),
        attachments: z.array(z.object({ name: z.string(), type: z.string(), content: z.string() })).optional(),
      });
      const { projectId, sessionId, message, attachments } = schema.parse(req.body);

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get or create session
      let session = sessionId ? await storage.getChatSession(sessionId) : null;
      if (!session) {
        session = await storage.createChatSession(projectId);
      }

      // Save user message with attachments
      await storage.addChatMessage({
        sessionId: session.id,
        role: "user",
        content: message,
        attachments: attachments,
      });

      // Get chatbot config with user's API keys
      const chatbotConfig = await storage.getChatbotConfig(projectId);
      const aiProvider = chatbotConfig?.aiProvider || "openai";
      const embeddingProvider = (chatbotConfig?.aiProvider || "openai") as "openai" | "gemini" | "tarang_ai";
      const userOpenaiKey = chatbotConfig?.openaiApiKey;
      const userGeminiKey = chatbotConfig?.geminiApiKey;

      // Use user's API key or fallback to environment variables
      let userOpenai: OpenAI | null = null;
      let userGemini: GoogleGenerativeAI | null = null;

      if (userOpenaiKey) {
        userOpenai = new OpenAI({ apiKey: userOpenaiKey });
      }
      if (userGeminiKey) {
        userGemini = new GoogleGenerativeAI(userGeminiKey);
      }

      // Get previous chat history for context
      let chatHistory = await storage.getChatMessages(session.id);
      
      // Auto-summarize history if it exceeds threshold
      let historyContext = "";
      if (chatHistory.length > CHAT_HISTORY_SUMMARIZE_THRESHOLD) {
        console.log(`[Chat] History has ${chatHistory.length} messages, triggering auto-summarization...`);
        
        const summary = await summarizeChatHistory(
          chatHistory,
          aiProvider,
          chatbotConfig?.tarangAiUrl,
          chatbotConfig?.tarangAiApiKey,
          chatbotConfig?.tarangAiModel,
          userOpenai,
          userGemini
        );
        
        if (summary) {
          console.log(`[Chat] History summarized (${summary.length} chars)`);
          // Keep only recent messages + summary
          const recentMessages = chatHistory.slice(-CHAT_HISTORY_KEEP_RECENT);
          const summaryMessage = `[Previous conversation summary]\n${summary}`;
          historyContext = `${summaryMessage}\n\n${recentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}`;
        } else {
          // Fallback if summarization fails
          historyContext = chatHistory.slice(-8).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
        }
      } else {
        // Use last 6 messages if history is short
        historyContext = chatHistory.slice(-6).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
      }

      // Get userId for later
      const userId = getUserId(req);
      
      let responseText = "";
      let tokensUsed = 0;
      const sources: { documentId: string; documentName: string; snippet: string }[] = [];

      console.log(`[Chat] Using AI provider: ${aiProvider}`);

      // Always detect if this message needs knowledge base chunks using AI
      const needsKnowledge = await detectNeedsKnowledgeBase(
        message,
        aiProvider,
        chatbotConfig?.tarangAiUrl,
        chatbotConfig?.tarangAiApiKey,
        chatbotConfig?.tarangAiModel,
        userOpenai,
        userGemini
      );

      // Only search for chunks if AI detected that knowledge base is needed
      let relevantChunks: any[] = [];
      if (needsKnowledge) {
        let queryEmbedding: number[] = [];
        try {
          const embeddingConfig = {
            openaiClient: userOpenai || openai || undefined,
            geminiClient: userGemini || gemini || undefined,
            tarangAiUrl: chatbotConfig?.tarangAiUrl,
            tarangAiApiKey: chatbotConfig?.tarangAiApiKey,
            tarangAiModel: chatbotConfig?.tarangAiModel,
          };
          queryEmbedding = await getEmbedding(embeddingProvider, message, embeddingConfig);
        } catch (err) {
          console.warn("Failed to generate query embedding:", err);
        }
        
        // Search for relevant context from knowledge base using semantic search
        relevantChunks = await storage.searchChunks(projectId, message, 5, queryEmbedding);
      }
      
      console.log(`[Chat] Intent detection result: needsKnowledge=${needsKnowledge}`);
      console.log(`[Chat] Found ${relevantChunks.length} relevant chunks for query: "${message}"`);
      if (relevantChunks.length > 0) {
        console.log("[Chat] First chunk content length:", relevantChunks[0].content.length);
      }

      if (relevantChunks.length > 0) {
        // Build context from chunks
        const context = relevantChunks
          .map((chunk) => `[Source: ${chunk.documentName}]\n${chunk.content}`)
          .join("\n\n");

        // Deduplicate sources by documentId
        const uniqueSources = new Map<string, { documentId: string; documentName: string; snippet: string }>();
        for (const chunk of relevantChunks) {
          if (!uniqueSources.has(chunk.documentId)) {
            uniqueSources.set(chunk.documentId, {
              documentId: chunk.documentId,
              documentName: chunk.documentName,
              snippet: chunk.content.slice(0, 150) + "...",
            });
          }
        }
        sources.push(...uniqueSources.values());

        const tone = chatbotConfig?.tone || "professional";
        
        const systemPrompt = `You are a helpful AI assistant. Answer questions ONLY based on the provided context. 
If the answer is not in the context, say "I don't have information about that in my knowledge base."
Be ${tone} in your responses.
Do not make up information. Always ground your answers in the provided sources.`;

        const fullContext = `${systemPrompt}\n\nPrevious context:\n${historyContext || "No previous messages"}\n\nDocumentation:\n${context}\n\nQuestion: ${message}`;

        if (aiProvider === "tarang_ai" && chatbotConfig?.tarangAiApiKey && chatbotConfig?.tarangAiModel) {
          console.log(`[Chat] Sending knowledge base query to Tarang AI (model: ${chatbotConfig?.tarangAiModel})`);
          try {
            const tarangUrl = chatbotConfig.tarangAiUrl || process.env.TARANG_AI_URL || "http://31.97.210.209:8001";
            responseText = await getTarangAIChatResponse(
              fullContext,
              tarangUrl,
              chatbotConfig.tarangAiApiKey,
              chatbotConfig.tarangAiModel,
              session.id
            );
            if (!responseText || responseText.length < 2) {
              console.warn("[Chat] Tarang AI returned empty/minimal response");
              responseText = "I don't have information about that in my knowledge base.";
            }
            tokensUsed = 0;
          } catch (err) {
            console.error("Tarang AI error:", err);
            responseText = "I apologize, but I'm having trouble processing your request. Please check your Tarang AI configuration in settings.";
          }
        } else if (aiProvider === "gemini" && (userGemini || gemini)) {
          console.log(`[Chat] Sending knowledge base query to Gemini`);
          try {
            const geminiClient = userGemini || gemini;
            const model = geminiClient!.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(fullContext);
            const rawResponse = result.response.text();
            responseText = (rawResponse || "").trim();
            if (!responseText || responseText.length < 2) {
              console.warn("[Chat] Gemini returned empty/minimal response");
              responseText = "I don't have information about that in my knowledge base.";
            }
            tokensUsed = 0;
          } catch (err) {
            console.error("Gemini error:", err);
            responseText = "I apologize, but I'm having trouble processing your request. Please check your Gemini API key in settings.";
          }
        } else if (userOpenai || openai) {
          console.log(`[Chat] Sending knowledge base query to OpenAI (model: gpt-5)`);
          try {
            const openaiClient = userOpenai || openai;
            const response = await openaiClient!.chat.completions.create({
              model: "gpt-5",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: fullContext },
              ],
              max_completion_tokens: 1024,
            });

            const rawResponse = response.choices[0].message.content;
            responseText = (rawResponse || "").trim();
            if (!responseText || responseText.length < 2) {
              console.warn("[Chat] OpenAI returned empty/minimal response");
              responseText = "I don't have information about that in my knowledge base.";
            }
            tokensUsed = response.usage?.total_tokens || 0;
          } catch (err) {
            console.error("OpenAI error:", err);
            responseText = "I apologize, but I'm having trouble processing your request. Please check your OpenAI API key in settings.";
          }
        } else {
          // No API key configured
          responseText = "Please configure an API key in Project Settings before using the chatbot.";
        }
      } else {
        // No relevant knowledge base chunks found - treat as general chat/casual message
        const generalChatPrompt = `Respond naturally and briefly to this message. Keep it friendly and concise:\n\nMessage: "${message}"\n\nPrevious context:\n${historyContext || "No previous messages"}`;

        if (aiProvider === "tarang_ai" && chatbotConfig?.tarangAiApiKey && chatbotConfig?.tarangAiModel) {
          console.log(`[Chat] Sending general chat message to Tarang AI (model: ${chatbotConfig?.tarangAiModel})`);
          try {
            const tarangUrl = chatbotConfig.tarangAiUrl || process.env.TARANG_AI_URL || "http://31.97.210.209:8001";
            responseText = await getTarangAIChatResponse(
              generalChatPrompt,
              tarangUrl,
              chatbotConfig.tarangAiApiKey,
              chatbotConfig.tarangAiModel,
              session.id
            );
            if (!responseText || responseText.length < 2) {
              responseText = "Hi there! How can I help you?";
            }
          } catch (err) {
            console.error("Tarang AI error for general chat:", err);
            responseText = "Hi! How can I assist you?";
          }
        } else if (aiProvider === "gemini" && (userGemini || gemini)) {
          console.log(`[Chat] Sending general chat message to Gemini`);
          try {
            const geminiClient = userGemini || gemini;
            const model = geminiClient!.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(generalChatPrompt);
            responseText = (result.response.text() || "").trim();
            if (!responseText || responseText.length < 2) {
              responseText = "Hi there! How can I help you?";
            }
          } catch (err) {
            console.error("Gemini error for general chat:", err);
            responseText = "Hi! How can I assist you?";
          }
        } else if (userOpenai || openai) {
          console.log(`[Chat] Sending general chat message to OpenAI (model: gpt-5)`);
          try {
            const openaiClient = userOpenai || openai;
            const response = await openaiClient!.chat.completions.create({
              model: "gpt-5",
              messages: [{ role: "user", content: generalChatPrompt }],
              max_completion_tokens: 256,
            });
            responseText = (response.choices[0].message.content || "").trim();
            if (!responseText || responseText.length < 2) {
              responseText = "Hi there! How can I help you?";
            }
            tokensUsed = response.usage?.total_tokens || 0;
          } catch (err) {
            console.error("OpenAI error for general chat:", err);
            responseText = "Hi! How can I assist you?";
          }
        } else {
          responseText = "Hi! How can I assist you?";
        }
      }

      // Save assistant message
      const assistantMessage = await storage.addChatMessage({
        sessionId: session.id,
        role: "assistant",
        content: responseText,
        sources: sources.length > 0 ? sources : undefined,
        tokensUsed,
      });

      console.log(`[Chat] Response sent from ${aiProvider} (${responseText.length} chars)`);

      // Log analytics
      await storage.logAnalyticsEvent({
        projectId,
        eventType: "query",
        metadata: {
          query: message,
          answered: sources.length > 0 || !needsKnowledge,
          tokensUsed,
          sourceDocIds: sources.map((s) => s.documentId),
        },
      });

      // Final validation - ensure we ALWAYS return a non-empty message
      if (!responseText || responseText.trim().length === 0) {
        responseText = "No response generated. Please try a different query or ensure your knowledge base has relevant content.";
      }
      
      // Get all messages for this session
      const allMessages = await storage.getChatMessages(session.id);
      
      const responsePayload = {
        sessionId: session.id,
        message: responseText,
        model: aiProvider,
        sources: sources.length > 0 ? sources : undefined,
        history: allMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          sources: msg.sources,
        })),
      };
      
      console.log("[Chat] Sending response:", { messageLength: responsePayload.message.length, hasSources: !!responsePayload.sources, historyLength: allMessages.length });
      res.json(responsePayload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error in chat:", error);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  // Delete chat session endpoint
  app.delete("/api/chat/:sessionId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const session = await storage.getChatSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Verify session ownership through project
      const project = await storage.getProject(session.projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteChatSession(req.params.sessionId);
      res.json({ message: "Session deleted" });
    } catch (error) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Analytics
  app.get("/api/analytics", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId, timeRange } = req.query;
      if (!projectId || typeof projectId !== "string") {
        return res.status(400).json({ message: "projectId required" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      let days = 7;
      if (timeRange === "24h") days = 1;
      else if (timeRange === "30d") days = 30;
      else if (timeRange === "90d") days = 90;

      const analytics = await storage.getAnalytics(projectId, days);
      
      // Generate daily stats for chart
      const dailyStats: { date: string; queries: number; tokens: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyStats.push({
          date: date.toISOString().split("T")[0],
          queries: Math.floor(Math.random() * 10), // Placeholder - would need to aggregate from events
          tokens: Math.floor(Math.random() * 1000),
        });
      }

      res.json({
        ...analytics,
        averageResponseTime: 250 + Math.floor(Math.random() * 100),
        dailyStats,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // MCP Server endpoints (public API for embedded chatbots)
  app.post("/api/mcp/:projectId/search", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers.authorization?.replace("Bearer ", "");
      const project = await storage.getProject(req.params.projectId);
      
      if (!project || project.mcpApiKey !== apiKey) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const { query, limit = 5 } = req.body;
      if (!query) {
        return res.status(400).json({ message: "query required" });
      }

      const results = await storage.searchChunks(req.params.projectId, query, limit);
      res.json({
        results: results.map((r) => ({
          documentId: r.documentId,
          documentName: r.documentName,
          content: r.content,
          score: 0.9 - Math.random() * 0.2, // Placeholder score
        })),
      });
    } catch (error) {
      console.error("MCP search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/mcp/:projectId/context/:docId", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers.authorization?.replace("Bearer ", "");
      const project = await storage.getProject(req.params.projectId);
      
      if (!project || project.mcpApiKey !== apiKey) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const doc = await storage.getDocument(req.params.docId);
      if (!doc || doc.projectId !== req.params.projectId) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json({
        documentId: doc.id,
        name: doc.name,
        content: doc.content,
        metadata: {
          type: doc.type,
          createdAt: doc.createdAt,
        },
      });
    } catch (error) {
      console.error("MCP context error:", error);
      res.status(500).json({ message: "Failed to get context" });
    }
  });

  app.get("/api/mcp/:projectId/sources", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers.authorization?.replace("Bearer ", "");
      const project = await storage.getProject(req.params.projectId);
      
      if (!project || project.mcpApiKey !== apiKey) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const docs = await storage.getDocuments(req.params.projectId);
      res.json({
        sources: docs.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          status: d.status,
        })),
        total: docs.length,
      });
    } catch (error) {
      console.error("MCP sources error:", error);
      res.status(500).json({ message: "Failed to list sources" });
    }
  });

  // Widget chat endpoint (public - for embedded chatbot)
  app.post("/api/widget/chat", async (req: Request, res: Response) => {
    try {
      const { projectId, apiKey, sessionId, message } = req.body;
      
      const project = await storage.getProject(projectId);
      if (!project || project.mcpApiKey !== apiKey) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      let session = sessionId ? await storage.getChatSession(sessionId) : null;
      if (!session) {
        session = await storage.createChatSession(projectId);
      }

      // Save user message
      await storage.addChatMessage({
        sessionId: session.id,
        role: "user",
        content: message,
      });

      // Search and respond
      const relevantChunks = await storage.searchChunks(projectId, message, 5);
      let responseText = "";
      const sources: { documentName: string; snippet: string }[] = [];

      if (relevantChunks.length > 0) {
        for (const chunk of relevantChunks.slice(0, 3)) {
          sources.push({
            documentName: chunk.documentName,
            snippet: chunk.content.slice(0, 100) + "...",
          });
        }

        const context = relevantChunks.map((c) => c.content).join("\n\n");
        const chatbotConfig = await storage.getChatbotConfig(projectId);
        const aiProvider = chatbotConfig?.aiProvider || "openai";

        if (aiProvider === "gemini" && gemini) {
          try {
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
            const systemMsg = `You are ${chatbotConfig?.botName || "AI Assistant"}. Answer only from the provided context. Be ${chatbotConfig?.tone || "professional"}.`;
            const fullPrompt = `${systemMsg}\n\nContext:\n${context}\n\nQuestion: ${message}`;
            const result = await model.generateContent(fullPrompt);
            responseText = result.response.text() || "";
          } catch (err) {
            console.error("Gemini error:", err);
            responseText = `Based on your knowledge base: ${relevantChunks[0].content.slice(0, 300)}...`;
          }
        } else if (openai) {
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-5",
              messages: [
                {
                  role: "system",
                  content: `You are ${chatbotConfig?.botName || "AI Assistant"}. Answer only from the provided context. Be ${chatbotConfig?.tone || "professional"}.`,
                },
                { role: "user", content: `Context:\n${context}\n\nQuestion: ${message}` },
              ],
              max_completion_tokens: 512,
            });
            responseText = response.choices[0].message.content || "";
          } catch (err) {
            console.error("OpenAI error:", err);
            responseText = `Based on your knowledge base: ${relevantChunks[0].content.slice(0, 300)}...`;
          }
        } else {
          responseText = `Based on your knowledge base: ${relevantChunks[0].content.slice(0, 300)}...`;
        }
      } else {
        responseText = "I don't have information about that in my knowledge base.";
      }

      await storage.addChatMessage({
        sessionId: session.id,
        role: "assistant",
        content: responseText,
      });

      const chatbotConfig = await storage.getChatbotConfig(projectId);
      res.json({
        sessionId: session.id,
        message: responseText,
        sources: chatbotConfig?.showSources ? sources : undefined,
      });
    } catch (error) {
      console.error("Widget chat error:", error);
      res.status(500).json({ message: "Chat failed" });
    }
  });

  // Widget script endpoint (public - for embedded chatbot)
  app.get("/widget.js", (req: Request, res: Response) => {
    const projectId = req.query.projectId;
    const apiKey = req.query.apiKey;
    const sessionId = req.query.sessionId;
    
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    
    const widgetCode = `
(function() {
  const projectId = "${projectId}";
  const apiKey = "${apiKey}";
  const sessionId = "${sessionId}";
  
  // Create widget container
  const container = document.createElement('div');
  container.id = 'kabot-widget-container';
  container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; width: 380px; height: 600px; background: white; border-radius: 12px; box-shadow: 0 5px 40px rgba(0,0,0,0.16); display: flex; flex-direction: column; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 12px 12px 0 0; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
  header.innerHTML = '<span>Chat with us</span><button id="kabot-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>';
  
  // Create messages area
  const messagesArea = document.createElement('div');
  messagesArea.id = 'kabot-messages';
  messagesArea.style.cssText = 'flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;';
  
  // Create input area
  const inputArea = document.createElement('div');
  inputArea.style.cssText = 'padding: 12px; border-top: 1px solid #e0e0e0; display: flex; gap: 8px;';
  inputArea.innerHTML = '<input id="kabot-input" type="text" placeholder="Type your message..." style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 14px;"><button id="kabot-send" style="background: #667eea; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: 500;">Send</button>';
  
  container.appendChild(header);
  container.appendChild(messagesArea);
  container.appendChild(inputArea);
  document.body.appendChild(container);
  
  // Handle send
  const input = document.getElementById('kabot-input');
  const sendBtn = document.getElementById('kabot-send');
  const closeBtn = document.getElementById('kabot-close');
  
  sendBtn.addEventListener('click', async () => {
    const message = input.value.trim();
    if (!message) return;
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'align-self: flex-end; background: #667eea; color: white; padding: 8px 12px; border-radius: 8px; max-width: 80%; word-wrap: break-word;';
    userMsg.textContent = message;
    messagesArea.appendChild(userMsg);
    input.value = '';
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    // Send to API
    try {
      const response = await fetch(window.location.origin.replace(window.location.hostname, '${req.get('host')}') + '/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          apiKey,
          sessionId,
          message
        })
      });
      
      const data = await response.json();
      const botMsg = document.createElement('div');
      botMsg.style.cssText = 'align-self: flex-start; background: #f0f0f0; color: #333; padding: 8px 12px; border-radius: 8px; max-width: 80%; word-wrap: break-word;';
      botMsg.textContent = data.message || 'Sorry, something went wrong.';
      messagesArea.appendChild(botMsg);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    } catch (e) {
      console.error('Chat error:', e);
    }
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
  });
  
  closeBtn.addEventListener('click', () => {
    container.style.display = 'none';
  });
})();
    `;
    
    res.send(widgetCode);
  });

  // Visitor tracking endpoint (public - for embedded chatbot)
  app.post("/api/visitor/track", async (req: Request, res: Response) => {
    try {
      const { projectId, apiKey, sessionId, pageUrl, referrer } = req.body;
      
      const project = await storage.getProject(projectId);
      if (!project || project.mcpApiKey !== apiKey) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      let visitor = sessionId ? await storage.getVisitorSession(sessionId) : null;
      if (!visitor) {
        visitor = await storage.createVisitorSession({
          projectId,
          sessionId: sessionId || `visitor-${Date.now()}-${Math.random()}`,
          pageUrl,
          referrer,
          chatMode: "ai",
        });
      } else {
        await storage.updateVisitorSession(visitor.id, { pageUrl, updatedAt: new Date() });
      }

      res.json({ sessionId: visitor.id });
    } catch (error) {
      console.error("Visitor tracking error:", error);
      res.status(500).json({ message: "Tracking failed" });
    }
  });

  // Visitors list endpoint (authenticated - owner only)
  app.get("/api/visitors", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      if (!projectId || typeof projectId !== "string") {
        return res.status(400).json({ message: "projectId required" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const visitors = await storage.getProjectVisitors(projectId);
      res.json(visitors);
    } catch (error) {
      console.error("Error fetching visitors:", error);
      res.status(500).json({ message: "Failed to fetch visitors" });
    }
  });

  // Live chat messages endpoint
  app.post("/api/live-chat/send", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { visitorSessionId, content } = req.body;
      
      const visitorSession = await storage.getVisitorSession(visitorSessionId);
      if (!visitorSession) {
        return res.status(404).json({ message: "Visitor session not found" });
      }

      const project = await storage.getProject(visitorSession.projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const message = await storage.addLiveChatMessage({
        visitorSessionId,
        sender: "owner",
        content,
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending live chat:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get live chat history
  app.get("/api/live-chat/:visitorSessionId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const visitorSession = await storage.getVisitorSession(req.params.visitorSessionId);
      if (!visitorSession) {
        return res.status(404).json({ message: "Visitor session not found" });
      }

      const project = await storage.getProject(visitorSession.projectId);
      if (!project || project.userId !== getUserId(req)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const messages = await storage.getLiveChatMessages(req.params.visitorSessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time chat
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on("connection", (socket) => {
    socket.on("join-visitor", (visitorSessionId: string) => {
      socket.join(`visitor-${visitorSessionId}`);
    });

    socket.on("send-message", async (data: { visitorSessionId: string; sender: string; content: string }) => {
      try {
        await storage.addLiveChatMessage({
          visitorSessionId: data.visitorSessionId,
          sender: data.sender,
          content: data.content,
        });
        io.to(`visitor-${data.visitorSessionId}`).emit("message", data);
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });
  });

  // Admin-only routes
  app.get("/api/admin/settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const settings = await storage.getAdminSettings();
      res.json(settings || { embeddingProvider: "sentence-transformers", embeddingModel: "all-MiniLM-L6-v2" });
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  app.put("/api/admin/settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { embeddingProvider, embeddingModel } = req.body;
      await storage.upsertAdminSettings({ embeddingProvider, embeddingModel });
      res.json({ message: "Settings updated" });
    } catch (error) {
      console.error("Error updating admin settings:", error);
      res.status(500).json({ message: "Failed to update admin settings" });
    }
  });

  // Get all users for admin (admin-only)
  app.get("/api/admin/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get user's AI model assignment (admin-only)
  app.get("/api/admin/user-models/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { userId } = req.params;
      const assignment = await storage.getUserModelAssignment(userId);
      res.json(assignment || null);
    } catch (error) {
      console.error("Error fetching user model assignment:", error);
      res.status(500).json({ message: "Failed to fetch user model assignment" });
    }
  });

  // Assign AI model to user (admin-only)
  app.put("/api/admin/user-models/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { userId } = req.params;
      const { aiProvider, tarangAiUrl, tarangAiApiKey, tarangAiModel, openaiApiKey, openaiModel, geminiApiKey, geminiModel } = req.body;
      
      const assignment = await storage.upsertUserModelAssignment(userId, {
        aiProvider,
        tarangAiUrl,
        tarangAiApiKey,
        tarangAiModel,
        openaiApiKey,
        openaiModel,
        geminiApiKey,
        geminiModel,
      });
      res.json(assignment);
    } catch (error) {
      console.error("Error updating user model assignment:", error);
      res.status(500).json({ message: "Failed to update user model assignment" });
    }
  });

  return httpServer;
}
