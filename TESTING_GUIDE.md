# Task 2: Chatbot Functionality Testing Guide

## Overview
The chatbot system is fully implemented with:
- **Semantic Search**: Uses embeddings to find relevant document chunks
- **Intent Detection**: AI determines if knowledge base is needed
- **Multi-Provider Support**: OpenAI, Gemini, Tarang AI
- **Fallback Handling**: Graceful responses when knowledge base doesn't have answers

---

## How the Chatbot Works

### 1. User Sends Message
User types a question in the Test Chatbot interface

### 2. Intent Detection (Line 886-895 in routes.ts)
AI analyzes the message to determine:
- **"yes"** = needs knowledge base lookup (specific topics, document questions)
- **"no"** = general conversation (greetings, general knowledge)

### 3. Embedding Generation (Line 909)
If knowledge base needed:
- User message → converted to embedding vector
- Same provider used for both document chunks and queries

### 4. Semantic Search (Line 915)
- Query embedding compared against all document embeddings
- Top 5 most similar chunks retrieved using cosine similarity
- Chunks grouped by source document

### 5. AI Response (Lines 924-1004)
- System prompt enforces grounding in provided context
- AI responds ONLY based on retrieved chunks
- Sources included in response if showSources enabled

### 6. Fallback Response
If no relevant chunks found:
- "I don't have information about that in my knowledge base."

---

## Testing Checklist

### Test Case 1: Document-Based Question
**Prerequisite**: Upload a sample document (e.g., company handbook, product manual)

1. Go to **Knowledge Library**
2. Upload a PDF or TXT file
3. Wait for "Ready" status
4. Go to **Test Chatbot**
5. Select the project
6. Ask a question about the document content
7. **Expected**: 
   - ✅ Answer based on document
   - ✅ Sources shown in response
   - ✅ Relevant chunks displayed

**Example**: If you upload a file about "Python programming basics":
- Ask: "What are Python data types?"
- Expected: Answer extracted from your document

---

### Test Case 2: General Question Without Document
1. Go to **Test Chatbot** (same project)
2. Ask a general knowledge question
3. **Expected**:
   - ✅ AI detects "no" on intent detection
   - ✅ No document chunks retrieved
   - ✅ Still answers general question (if AI provider supports it)
   - ✅ No sources shown

**Example Questions**:
- "What is machine learning?"
- "Hello! How are you?"
- "What is the capital of France?"

---

### Test Case 3: Unanswered Question
1. Go to **Test Chatbot** (same project)
2. Ask a question about something NOT in your document
3. **Expected**:
   - ✅ AI detects "yes" (needs knowledge base)
   - ✅ No relevant chunks found
   - ✅ Fallback response: "I don't have information about that..."
   - ✅ No sources shown

**Example**: If document is about "Python", ask "What is Java?"

---

### Test Case 4: Embedding Provider Switching
1. Upload a document
2. Go to **Knowledge Library**
3. Hover over the document
4. Click the regenerate button
5. Select **Sentence Transformers**
6. Click regenerate
7. Wait for "Ready" status
8. Go to **Test Chatbot** and ask questions
9. **Repeat steps 4-8 with different providers** (OpenAI, Gemini, Tarang AI)
10. **Expected**:
    - ✅ Works with all providers
    - ✅ Same questions produce similar quality answers
    - ✅ Embeddings properly stored and retrieved

---

### Test Case 5: Chat History & Context
1. Go to **Test Chatbot**
2. Ask: "What is X?" (about your document)
3. Ask: "Tell me more about it"
4. **Expected**:
    - ✅ Bot remembers previous context
    - ✅ Follow-up questions use chat history
    - ✅ Conversation flows naturally

---

### Test Case 6: Multiple Documents
1. Upload **Document A** (topic: Python)
2. Upload **Document B** (topic: JavaScript)
3. Go to **Test Chatbot**
4. Ask: "What are the differences between Python and JavaScript?"
5. **Expected**:
    - ✅ Answer uses both documents
    - ✅ Both sources shown in response
    - ✅ Accurate comparison

---

## Debugging Tips

### Check the Logs
Open browser console (F12) and look for:
- `[Chat] Intent detection: "..." -> needs_knowledge_base: true/false`
- `[Chat] Found X relevant chunks for query: "..."`
- `[Chat] Using AI provider: ...`

### If No Sources Found
1. **Regenerate embeddings** with Sentence Transformers (most reliable)
2. **Check document status** - should show "Ready"
3. **Try different questions** - maybe specific keywords match better

### If Empty Response
1. Check AI provider configuration in **Chatbot Builder**
2. Verify API keys are set
3. Check server logs for errors

### If Answers Seem Wrong
1. **Adjust chatbot tone** in Chatbot Builder (professional, friendly, formal)
2. **Check system prompt** - enforces grounding in context
3. **Regenerate embeddings** with different provider for better semantic search

---

## Current Implementation Details

| Component | Implementation |
|-----------|-----------------|
| **Embeddings** | pgvector (768 dimensions) in `documentEmbeddings` table |
| **Semantic Search** | Cosine similarity (computed in-database) |
| **Intent Detection** | AI-powered (asks AI if knowledge base needed) |
| **Chat History** | Stored in `chatMessages` table, auto-summarizes after 10 messages |
| **Sources** | Deduplicated by document, snippet shown (first 150 chars) |
| **Fallback** | Graceful message when knowledge base can't answer |

---

## Summary

✅ **Task 2 Infrastructure Complete**:
- Embeddings used for semantic search
- Intent detection handles both document and general questions
- Fallback for unanswered questions
- Multi-provider support
- Chat history with auto-summarization

**Status**: Ready for testing with your documents
