# Live Visitor Tracking - Flow Diagram

## Visitor Activity Timeline

```
VISITOR LIFECYCLE:
═══════════════════════════════════════════════════════════════════════════════

┌─ Visitor Arrives ─────────────────────────────────────────────────────────┐
│  POST /api/visitor/track                                                   │
│  → Creates: id, projectId, sessionId, isActive=true, updatedAt=NOW       │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─ Widget Open / User Interacts ────────────────────────────────────────────┐
│  GET /api/chat (user sends message)                                        │
│  → Updates: updatedAt=NOW (via visitor tracking)                           │
│  → Resets 5-minute inactivity timer                                        │
│  → VISIBLE in: GET /api/visitors (shows in live list)                      │
└────────────────────────────────────────────────────────────────────────────┘
                    │                                        │
                    ▼                                        ▼
        ┌─ No Activity for <5min ─┐          ┌─ No Activity for >5min ─┐
        │  → STILL in live list    │          │  → REMOVED from list    │
        │  → isActive still TRUE   │          │  → Filtered by query    │
        │  → Can re-engage quickly │          │  → Must re-track        │
        └──────────────────────────┘          └─────────────────────────┘
                    │                                        │
                    ▼                                        ▼
        ┌─ User Closes Widget ──────────────────────────────────────────────┐
        │  POST /api/visitor/disconnect (called from closeBtn click)         │
        │  → Updates: isActive=false, updatedAt=NOW                          │
        │  → REMOVED from: GET /api/visitors (live list)                     │
        │  → PERMANENT until re-tracked                                      │
        └────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌─ Visitor Returns ─────────────────────────────────────────────────┐
        │  POST /api/visitor/track (new session created)                     │
        │  → Creates NEW visitor session (different ID)                      │
        │  → Back to "Visitor Arrives" phase                                 │
        └────────────────────────────────────────────────────────────────────┘
```

## API Call Flow

```
FRONTEND (Widget) → BACKEND (Live Tracking)
═════════════════════════════════════════════════════════════════════════════

1. PAGE LOAD:
   Widget detects page load
        ↓
   POST /api/visitor/track
   {
     projectId: "abc123",
     apiKey: "key123",
     sessionId: "sess456",
     pageUrl: "example.com/page",
     referrer: "google.com"
   }
        ↓
   Creates visitor in DB with isActive=true
        ↓
   Returns: { sessionId: "sess456" }

───────────────────────────────────────────────────────────────────────────────

2. USER INTERACTION:
   User sends chat message
        ↓
   POST /api/widget/chat
   (visitor tracking happens automatically if any activity)
        ↓
   Updates visitor.updatedAt = NOW
        ↓
   Response: { message: "...", sessionId: "sess456" }

───────────────────────────────────────────────────────────────────────────────

3. OWNER CHECKS VISITORS:
   Owner opens "Active Visitors" page
        ↓
   GET /api/visitors?projectId=abc123
   (with default liveOnly=true)
        ↓
   Backend queries:
   SELECT * FROM visitor_sessions
   WHERE projectId='abc123'
     AND isActive=true
     AND updatedAt > NOW() - INTERVAL '5 minutes'
        ↓
   Returns only LIVE visitors

───────────────────────────────────────────────────────────────────────────────

4. VISITOR LEAVES:
   User closes widget / navigates away
        ↓
   POST /api/visitor/disconnect
   {
     visitorSessionId: "sess456"
   }
        ↓
   Updates: isActive=false, updatedAt=NOW
        ↓
   Next GET /api/visitors call EXCLUDES this visitor

───────────────────────────────────────────────────────────────────────────────

5. OWNER CHECKS AGAIN:
   After visitor disconnects
        ↓
   GET /api/visitors?projectId=abc123
        ↓
   Visitor no longer appears in results
        ↓
   To see ALL visitors (including disconnected):
   GET /api/visitors?projectId=abc123&liveOnly=false
```

## Database State Changes

```
VISITOR_SESSIONS TABLE
═══════════════════════════════════════════════════════════════════════════════

id      │ projectId  │ sessionId  │ isActive │ updatedAt            │ pageUrl
────────┼────────────┼────────────┼──────────┼──────────────────────┼────────────
sess456 │ proj123    │ sess456    │ true     │ 2025-12-31 10:00:00  │ /page1
sess789 │ proj123    │ sess789    │ true     │ 2025-12-31 10:02:30  │ /page2
sess012 │ proj123    │ sess012    │ false    │ 2025-12-31 09:50:00  │ /page1

                              ↓

FILTERED BY getLiveVisitors(proj123, 5 minutes):
WHERE projectId='proj123' 
  AND isActive=true 
  AND updatedAt > 2025-12-31 09:57:30

Result:
sess456 │ proj123    │ sess456    │ true     │ 2025-12-31 10:00:00  │ /page1  ✓
sess789 │ proj123    │ sess789    │ true     │ 2025-12-31 10:02:30  │ /page2  ✓
(sess012 excluded - isActive=false, too old)
```

## Real-time Polling Pattern

```
FRONTEND VISITORS PAGE:
═════════════════════════════════════════════════════════════════════════════

useQuery({
  queryKey: ["/api/visitors", selectedProject],
  queryFn: async () => {
    GET /api/visitors?projectId={selectedProject}
  },
  enabled: !!selectedProject,
  refetchInterval: 5000  ← Polls every 5 seconds
});

│
├─ 00s: First load → API call #1
├─ 05s: Refetch → API call #2  
├─ 10s: Refetch → API call #3
├─ 15s: Refetch → API call #4 (detects new visitor)
├─ 20s: Refetch → API call #5 (visitor still live)
├─ 25s: Refetch → API call #6 (visitor marked inactive)
│       Updated UI removes visitor from list
└─ 30s: Refetch → API call #7

OPTIMIZATION OPPORTUNITY:
Could switch to WebSocket for true real-time updates
instead of polling every 5 seconds
```

## Activity Tracking Timeline Example

```
REAL WORLD EXAMPLE:
═════════════════════════════════════════════════════════════════════════════

10:00:00  └─ Visitor opens page
          POST /api/visitor/track → isActive=true, updatedAt=10:00:00
          
10:00:30  └─ Visitor sends message "Hello"
          POST /api/widget/chat → updatedAt=10:00:30
          LIVE? YES (within 5 min)
          
10:02:00  └─ Visitor sends message "How are you?"
          POST /api/widget/chat → updatedAt=10:02:00
          LIVE? YES (within 5 min)
          
10:04:00  └─ Visitor scrolls, no messages sent
          No API call, updatedAt still = 10:02:00
          LIVE? YES (10:04:00 - 10:02:00 = 2 min, < 5 min)
          
10:07:00  └─ Owner checks visitors
          GET /api/visitors → updatedAt was 10:02:00
          Is 10:07:00 - 10:02:00 = 5 min? NO (< 5 min)
          LIVE? YES (still shown)
          
10:07:30  └─ Owner checks again
          Visitor last seen at 10:02:00
          Is 10:07:30 - 10:02:00 = 5.5 min? YES (≥ 5 min)
          LIVE? NO (filtered out)
          → Visitor auto-aged out of live list
          
10:10:00  └─ Visitor closes widget
          POST /api/visitor/disconnect → isActive=false
          LIVE? NO (immediately marked inactive)
          
10:15:00  └─ Visitor returns to page
          POST /api/visitor/track → NEW SESSION
          (Different sessionId, new visitor entry)
```

## Configuration Reference

```javascript
// In /api/visitors endpoint
const inactivityMinutes = 5; // CONFIGURABLE

// To change inactivity window:
await storage.getLiveVisitors(projectId, 10);  // 10 minutes
await storage.getLiveVisitors(projectId, 2);   // 2 minutes
await storage.getLiveVisitors(projectId, 30);  // 30 minutes

// Query parameter to override default
GET /api/visitors?projectId=abc&liveOnly=false
// Returns ALL visitors regardless of activity

// Widget disconnect on close
POST /api/visitor/disconnect (automatic)
```
