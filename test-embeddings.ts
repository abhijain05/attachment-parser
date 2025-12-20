import fs from "fs";
import path from "path";
import JSZip from "jszip";
import OpenAI from "openai";
import { db } from "./server/db";
import { documentEmbeddings } from "@shared/schema";
import { sql } from "drizzle-orm";

// Extract text from DOCX
async function extractDocxText(buffer: Buffer): Promise<string> {
  const zip = new JSZip();
  await zip.loadAsync(buffer);
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) return "DOCX file has no content";
  const xmlContent = await xmlFile.async("text");
  const text = xmlContent
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || "DOCX document (no text content)";
}

// Chunk text
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

async function testEmbeddings() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Read DOCX file
  const docPath = path.join("attached_assets", "Abhishek_Jain_11_Yrs_SAP_ABAP_FIORI_Hitachi_1766200375105.docx");
  if (!fs.existsSync(docPath)) {
    console.error("Document not found:", docPath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(docPath);
  console.log("Extracting text from document...");
  const text = await extractDocxText(buffer);
  console.log("Extracted text length:", text.length);

  // Chunk text
  const chunks = chunkText(text);
  console.log("Created", chunks.length, "chunks");

  // Test data
  const userId = "test-user"; // This would be admin@tarang.dev
  const documentId = "sara-project-doc";
  const projectName = "sara";

  console.log("Creating embeddings...");
  const embeddingsData = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);

    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = response.data[0].embedding;
      embeddingsData.push({
        userId,
        documentId,
        chunkIndex: i,
        content: chunk,
        embedding,
        metadata: {
          project: projectName,
          fileName: "resume.docx",
          totalChunks: chunks.length,
        },
      });
    } catch (error) {
      console.error(`Error creating embedding for chunk ${i}:`, error);
    }
  }

  // Store embeddings
  console.log("Storing", embeddingsData.length, "embeddings in database...");
  try {
    await db.insert(documentEmbeddings).values(embeddingsData);
    console.log("Successfully stored embeddings!");

    // Verify
    const stored = await db.select().from(documentEmbeddings).where(sql`user_id = ${userId}`);
    console.log("Verified: Found", stored.length, "embeddings in database");
    console.log("Sample embedding:", {
      id: stored[0].id,
      userId: stored[0].userId,
      documentId: stored[0].documentId,
      chunkIndex: stored[0].chunkIndex,
      contentLength: stored[0].content.length,
      embeddingDimension: Array.isArray(stored[0].embedding) ? stored[0].embedding.length : "N/A",
    });
  } catch (error) {
    console.error("Error storing embeddings:", error);
    process.exit(1);
  }

  process.exit(0);
}

testEmbeddings();
