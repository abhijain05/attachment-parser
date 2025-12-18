# PROJECT_BLUEPRINT.md

## 1. Product Vision

### Problem Statement
Businesses accumulate vast amounts of internal knowledge across documents, websites, and various sources. When they want to leverage AI to answer customer or employee questions, they face critical challenges:
- AI can hallucinate and provide incorrect information
- Knowledge is scattered and unstructured
- No easy way to create governed, controllable AI assistants
- Difficult to embed AI capabilities into existing websites

### Target Users
- **Small to Medium Businesses** needing AI-powered customer support
- **Enterprise Knowledge Teams** managing internal documentation
- **SaaS Companies** wanting to add AI-powered help to their products
- **Agencies** building chatbots for multiple clients

### Value Proposition
A platform where businesses can:
1. Upload their internal knowledge (PDFs, documents, URLs)
2. Get an AI that answers ONLY from approved sources
3. Customize and embed a chatbot on any website
4. Maintain full control, audit trails, and analytics

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Dashboard  │  │  Knowledge   │  │  Chatbot   │  │  Analytics │ │
│  │    Page     │  │   Library    │  │  Builder   │  │    Page    │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘ │
│         │                │                 │                │       │
│         └────────────────┴─────────────────┴────────────────┘       │
│                              │                                       │
│                        React + Vite                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTP/REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Express.js Server                         │   │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐ │   │
│  │  │   Auth   │  │  Projects  │  │Documents │  │    Chat    │ │   │
│  │  │  Routes  │  │   CRUD     │  │   CRUD   │  │   Engine   │ │   │
│  │  └────┬─────┘  └─────┬──────┘  └────┬─────┘  └─────┬──────┘ │   │
│  │       │              │              │              │         │   │
│  │       └──────────────┴──────────────┴──────────────┘         │   │
│  │                          │                                    │   │
│  │                    Storage Layer                              │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────┴───────────────────────────────────┐   │
│  │                     MCP Server                                │   │
│  │    ┌──────────┐    ┌──────────────┐    ┌───────────────┐    │   │
│  │    │  search  │    │  get_context │    │  list_sources │    │   │
│  │    └──────────┘    └──────────────┘    └───────────────┘    │   │
│  └───────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
      ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
      │   PostgreSQL  │  │    OpenAI     │  │   External    │
      │   Database    │  │      API      │  │   Websites    │
      │               │  │   (GPT-5)     │  │   (Embed)     │
      │  - Users      │  │               │  │               │
      │  - Projects   │  │  RAG-based    │  │  <script>     │
      │  - Documents  │  │  Responses    │  │   Widget      │
      │  - Chunks     │  │               │  │               │
      │  - Analytics  │  │               │  │               │
      └───────────────┘  └───────────────┘  └───────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter
- **State Management:** TanStack Query (React Query)
- **UI Components:** Shadcn/UI + Radix primitives
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Authentication:** Replit Auth (OpenID Connect)
- **File Processing:** Multer

### Database
- **Primary Database:** PostgreSQL (Neon-backed via Replit)
- **ORM:** Drizzle ORM
- **Session Storage:** connect-pg-simple

### AI & ML
- **LLM Provider:** OpenAI (GPT-5)
- **Approach:** RAG (Retrieval-Augmented Generation)
- **Text Processing:** Custom chunking algorithm

### External Services
- **Authentication:** Replit OIDC Provider
- **File Storage:** In-memory (MVP), Object Storage (future)

---

## 4. Task Breakdown

### Phase 1: MVP Foundation

#### Task 1: Project Blueprint & Schema Design
**Objective:** Define complete product scope, architecture, and data models

**Deliverables:**
- PROJECT_BLUEPRINT.md
- shared/schema.ts with all database models
- Design guidelines configuration

**Dependencies:** None

**Status:** [x] Completed

---

#### Task 2: Frontend Implementation
**Objective:** Build all user-facing interfaces

**Deliverables:**
- Landing page with feature overview
- Dashboard with stats and quick actions
- Projects list/create/delete
- Knowledge Library with drag-drop upload
- Chatbot Builder with live preview
- Embed Script generator
- MCP Server documentation page
- Analytics dashboard

**Dependencies:** Task 1

**Status:** [x] Completed

---

#### Task 3: Backend Implementation
**Objective:** Implement all API endpoints and business logic

**Deliverables:**
- Replit Auth integration
- Projects CRUD API
- Documents CRUD with file processing
- Text chunking and indexing
- Chat/AI response engine with RAG
- Chatbot configuration API
- Analytics tracking and retrieval
- MCP Server endpoints

**Dependencies:** Task 1, Task 2

**Status:** [x] Completed

---

#### Task 4: Integration & Testing
**Objective:** Connect frontend to backend and verify functionality

**Deliverables:**
- React Query integration for all endpoints
- Loading/error states throughout
- End-to-end user journey testing
- Bug fixes and polish
- Modern gradient theme (purple-blue-teal) with mobile-first design
- Multi-AI provider support (OpenAI and Gemini)

**Dependencies:** Task 2, Task 3

**Status:** [x] Completed

---

### Phase 2: Enhanced Features (Future)

#### Task 5: Vector Database Integration
**Objective:** Implement semantic search for better context retrieval

**Deliverables:**
- Vector embeddings generation
- Pinecone/Weaviate integration
- Improved search relevance

**Dependencies:** Phase 1 complete

**Status:** [ ] Not Started

---

#### Task 6: Advanced Document Processing
**Objective:** Support more document formats and extraction

**Deliverables:**
- DOCX support
- OCR for images
- Website crawling
- Document versioning

**Dependencies:** Phase 1 complete

**Status:** [ ] Not Started

---

#### Task 7: Multi-Model AI Support
**Objective:** Allow users to choose AI providers

**Deliverables:**
- Claude integration (future)
- Gemini integration (✓ Completed in Phase 1)
- Local model support
- Model comparison tools

**Dependencies:** Phase 1 complete

**Status:** [~] Partially Started (Gemini complete, Claude/local pending)

---

### Phase 3: Enterprise Features (Future)

#### Task 8: Team & Permissions
**Objective:** Multi-user access with roles

**Deliverables:**
- Team invitations
- Role-based access control
- Audit logging

**Dependencies:** Phase 2 complete

**Status:** [ ] Not Started

---

#### Task 9: White-Label & Customization
**Objective:** Full brand customization

**Deliverables:**
- Custom domains
- White-label chatbot
- Theme auto-detection

**Dependencies:** Phase 2 complete

**Status:** [ ] Not Started

---

## 5. Phase-wise Roadmap

### Phase 1: MVP (Current)
- Core platform functionality
- Single user per account
- Basic document support (PDF, TXT, MD, URL)
- Keyword-based search
- Customizable chatbot
- Embeddable script
- Basic analytics

### Phase 2: Enhanced
- Vector search (semantic)
- More document formats
- Multi-model AI support
- Advanced analytics
- API rate limiting

### Phase 3: Scale
- Team collaboration
- White-label options
- Custom domains
- SLA guarantees
- Dedicated support

### Phase 4: Enterprise
- SSO/SAML
- Data residency options
- Custom integrations
- On-premise deployment
- Enterprise SLAs

---

## 6. Non-Functional Requirements

### Security
- [x] Authentication via Replit Auth (OAuth 2.0/OIDC)
- [x] Session-based auth with secure cookies
- [x] API key authentication for MCP endpoints
- [x] Project-level data isolation
- [ ] Rate limiting (Phase 2)
- [ ] Input sanitization for XSS prevention

### Privacy
- [x] User data isolated by account
- [x] No cross-tenant data access
- [ ] GDPR compliance tools (Phase 3)
- [ ] Data export functionality

### Performance
- [x] Efficient text chunking
- [x] Async document processing
- [ ] Response caching (Phase 2)
- [ ] CDN for widget delivery

### Cost Control
- [x] Token usage tracking per project
- [ ] Usage quotas and limits (Phase 2)
- [ ] Cost alerts and budgets (Phase 3)

### Reliability
- [x] PostgreSQL with Neon (managed)
- [x] Error handling throughout
- [ ] Automated backups
- [ ] Monitoring and alerting

---

## 7. Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | User accounts (Replit Auth) |
| `sessions` | Session storage for auth |
| `projects` | Knowledge base projects |
| `documents` | Uploaded knowledge sources |
| `document_chunks` | Text chunks for RAG |
| `chatbot_configs` | Chatbot customization |
| `chat_sessions` | Conversation sessions |
| `chat_messages` | Individual messages |
| `analytics_events` | Usage tracking |

---

## 8. API Endpoints Summary

### Authentication
- `GET /api/login` - Initiate login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Logout
- `GET /api/auth/user` - Get current user

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `DELETE /api/projects/:id` - Delete project

### Documents
- `GET /api/documents?projectId=x` - List documents
- `POST /api/documents/upload` - Upload file
- `POST /api/documents/url` - Add URL
- `DELETE /api/documents/:id` - Delete document

### Chatbot
- `GET /api/chatbot-config/:projectId` - Get config
- `PUT /api/chatbot-config/:projectId` - Update config
- `POST /api/chat` - Chat (authenticated)
- `POST /api/widget/chat` - Chat (widget/public)

### Analytics
- `GET /api/analytics?projectId=x` - Get analytics
- `GET /api/stats` - Get user stats

### MCP Server
- `POST /api/mcp/:projectId/search` - Search knowledge
- `GET /api/mcp/:projectId/context/:docId` - Get document
- `GET /api/mcp/:projectId/sources` - List sources
