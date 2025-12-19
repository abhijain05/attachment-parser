# Knowledge AI Platform

## Overview

A SaaS platform where businesses can upload their internal knowledge (documents, websites, text) and create governed AI assistants that answer only from approved sources. The system includes:

- **Knowledge Ingestion**: Upload PDFs, TXT, Markdown files, and URLs
- **MCP Server**: Each project exposes Model Context Protocol endpoints for AI integration
- **Customizable Chatbot**: Fully configurable widget for any website
- **Analytics**: Track queries, token usage, and source attribution

## Project Architecture

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and API client
│   │   └── pages/         # Route pages
├── server/                # Express.js backend
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Data access layer
│   └── replitAuth.ts      # Authentication
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle ORM models
└── PROJECT_BLUEPRINT.md   # Detailed product specification
```

## Key Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/UI, TanStack Query
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Auth**: Replit Auth (OpenID Connect)
- **AI**: Multi-provider support
  - OpenAI GPT-5 for RAG-based responses
  - Google Gemini 2.0 Flash for RAG-based responses

## Database Schema

| Table | Purpose |
|-------|---------|
| users | User accounts |
| sessions | Auth sessions |
| projects | Knowledge base projects |
| documents | Uploaded files/URLs |
| document_chunks | Text chunks for search |
| chatbot_configs | Widget customization |
| chat_sessions | Conversations |
| chat_messages | Messages |
| analytics_events | Usage tracking |

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

Optional (at least one required for AI responses):
- `OPENAI_API_KEY` - OpenAI API key for GPT-5 responses
- `GEMINI_API_KEY` - Google Gemini API key for Gemini responses

## Recent Changes

- **2024-12-19**: Dual Chat Mode Enhancement (AI + Live Owner Chat)
  - New database tables: visitor_sessions, live_chat_messages
  - Visitor session tracking with page URL, referrer, and chat mode
  - Real-time WebSocket support for live owner-visitor chat
  - API endpoints for visitor tracking, live chat messaging
  - Visitors dashboard page to see active visitors and chat with them
  - Live chat message history storage and retrieval
  - Chat mode indicators (AI vs Live) for each visitor session

- **2024-12-18**: Initial MVP implementation with multi-AI support
  - Complete schema with all database models including aiProvider field
  - Full frontend with dashboard, projects, knowledge library, chatbot builder, embed script, MCP docs, analytics
  - Backend with auth, CRUD operations, file processing, chat/AI engine, MCP endpoints
  - Replit Auth integration
  - RAG-based AI responses with OpenAI GPT-5 and Google Gemini 2.0
  - Users can select AI provider (OpenAI or Gemini) per chatbot configuration
  - Modern gradient theme with purple-blue-teal colors and mobile-first design

## User Preferences

- Design follows design_guidelines.md (Modern enterprise SaaS aesthetic)
- Inter font for UI, JetBrains Mono for code
- Blue primary color (#3B82F6)
- Light/dark mode support

## Running the Project

The application runs via the "Start application" workflow which executes `npm run dev`. This starts both the Express backend and Vite frontend on port 5000.

## API Reference

See PROJECT_BLUEPRINT.md for complete API documentation.
