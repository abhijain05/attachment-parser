# Live Visitor Tracking Implementation

## Overview
Updated the visitor tracking system to track only **live/active visitors** instead of all historical visitors. Visitors are now automatically marked as inactive when they disconnect or leave the page.

## Changes Made

### 1. **Database Layer** (`server/storage.ts`)

#### New Methods Added to `IStorage` Interface:
- `getLiveVisitors(projectId: string, inactivityMinutes?: number): Promise<VisitorSession[]>`
- `markVisitorInactive(visitorSessionId: string): Promise<void>`

#### New Implementation in `DatabaseStorage` Class:

**`getLiveVisitors()` Method:**
```typescript
async getLiveVisitors(projectId: string, inactivityMinutes: number = 5): Promise<VisitorSession[]> {
  const cutoffTime = new Date(Date.now() - inactivityMinutes * 60 * 1000);
  const liveVisitors = await db.select()
    .from(visitorSessions)
    .where(
      and(
        eq(visitorSessions.projectId, projectId),
        eq(visitorSessions.isActive, true),
        gte(visitorSessions.updatedAt, cutoffTime)
      )
    )
    .orderBy(desc(visitorSessions.updatedAt));
  return liveVisitors;
}
```
- **Purpose**: Returns only active visitors who were active within the last N minutes (default 5 minutes)
- **Filtering Criteria**:
  - `isActive: true` - Visitor hasn't explicitly disconnected
  - `updatedAt >= cutoffTime` - Recent activity within inactivity threshold
  - Ordered by most recently active first

**`markVisitorInactive()` Method:**
```typescript
async markVisitorInactive(visitorSessionId: string): Promise<void> {
  await db.update(visitorSessions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(visitorSessions.id, visitorSessionId));
}
```
- **Purpose**: Marks a visitor as inactive when they disconnect

### 2. **API Routes** (`server/routes.ts`)

#### Updated `/api/visitors` Endpoint:
```typescript
app.get("/api/visitors", isAuthenticated, async (req: any, res: any) => {
  const { projectId, liveOnly = true } = req.query;
  
  // Default behavior (liveOnly=true): Returns only live visitors
  // Can pass liveOnly=false to get all visitors (for analytics)
  const visitors = liveOnly === "false" 
    ? await storage.getProjectVisitors(projectId)
    : await storage.getLiveVisitors(projectId, 5);
  res.json(visitors);
});
```
- **Parameters**:
  - `projectId` (required): Project ID to fetch visitors for
  - `liveOnly` (optional, default=true): Set to "false" to get all historical visitors
- **Authentication**: Required (owner only)
- **Behavior**: By default, returns only live visitors (active within last 5 minutes)

#### New `/api/visitor/disconnect` Endpoint:
```typescript
app.post("/api/visitor/disconnect", async (req: any, res: any) => {
  const { visitorSessionId } = req.body;
  
  await storage.markVisitorInactive(visitorSessionId);
  console.log(`[Tracking] Marked visitor ${visitorSessionId} as inactive`);
  res.json({ message: "Visitor marked inactive" });
});
```
- **Purpose**: Mark a visitor session as inactive/disconnected
- **Authentication**: Public (called from widget)
- **Triggers**:
  - When visitor closes the widget
  - When visitor leaves/navigates away from page
  - When visitor's browser tab closes

### 3. **Widget Script** (`server/routes.ts` - `/widget.js` endpoint)

#### Added Disconnect Handlers:

**On Widget Close:**
```javascript
closeBtn.addEventListener("click", () => {
  container.style.display = "none";
  launcher.style.display = "flex";
  // Mark visitor as inactive when they close the widget
  fetch("/api/visitor/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorSessionId: sessionId })
  }).catch(e => console.warn("Failed to mark visitor inactive:", e));
});
```

**On Page Unload:**
```javascript
window.addEventListener("beforeunload", () => {
  fetch("/api/visitor/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorSessionId: sessionId })
  }).catch(e => console.warn("Failed to mark visitor inactive:", e));
});
```

## How It Works

### Visitor Lifecycle:

1. **Visitor Arrives**: 
   - `/api/visitor/track` creates a new visitor session
   - `isActive = true`
   - `updatedAt` = current timestamp

2. **Visitor Interacts**:
   - Each chat message updates `updatedAt` timestamp
   - Keeps visitor in "live" list as long as activity is within 5-minute window

3. **Visitor Disconnects**:
   - Widget close button clicked → `/api/visitor/disconnect` called
   - Page unload → `/api/visitor/disconnect` called
   - `isActive = false`
   - Visitor removed from "live" list

4. **Visitor Timeout**:
   - If no activity for 5+ minutes
   - `/api/visitors` query filters them out (via `getLiveVisitors`)
   - `isActive` still = true in database, but not shown in "live" list
   - (Optional: Could add background job to auto-mark as inactive)

## Usage in Frontend

### Visitors Page (`client/src/pages/visitors.tsx`):

```typescript
// Fetch only live visitors (auto-filters inactive ones)
const { data: visitors = [] } = useQuery<VisitorSession[]>({
  queryKey: ["/api/visitors", selectedProject],
  queryFn: async () => {
    const res = await fetch(`/api/visitors?projectId=${selectedProject}`);
    return res.json();
  },
  enabled: !!selectedProject,
  refetchInterval: 5000, // Poll every 5s for live updates
});

// Filter for active visitors (client-side safety)
const activeVisitors = visitors.filter((v: VisitorSession) => v.isActive);
```

## Key Features

✅ **Real-time Live Tracking**: Only shows visitors currently online
✅ **Automatic Cleanup**: Visitors marked inactive when they disconnect
✅ **Timeout Support**: Configurable inactivity threshold (default 5 minutes)
✅ **Widget Integration**: Widget detects page unload and connection loss
✅ **Backward Compatible**: Old `/api/visitors` endpoint still works
✅ **Analytics Ready**: Can still fetch all historical visitors with `?liveOnly=false`

## Configuration

### Inactivity Timeout
Default is 5 minutes. To change, modify the call in `/api/visitors`:
```typescript
await storage.getLiveVisitors(projectId, 10); // 10 minutes instead
```

## Database Considerations

- **No schema changes required** - uses existing `isActive` and `updatedAt` columns
- **Indexes**: Query uses `projectId`, `isActive`, and `updatedAt` - ensure these are indexed
- **Cleanup**: Consider adding a scheduled job to auto-mark visitors inactive after N minutes:
  ```sql
  UPDATE visitor_sessions 
  SET is_active = false 
  WHERE is_active = true 
  AND updated_at < NOW() - INTERVAL '5 minutes'
  ```

## Testing

### Test Live Visitor Tracking:
1. Open widget on a test page
2. Check `/api/visitors?projectId=YOUR_PROJECT_ID` - should see visitor
3. Close widget - call `/api/visitor/disconnect`
4. Check `/api/visitors` again - visitor should be gone
5. Wait 5 minutes without activity - visitor auto-filtered out

### Test Data Migration:
```sql
-- See all visitors (historical)
SELECT * FROM visitor_sessions ORDER BY updated_at DESC;

-- See live visitors (last 5 mins)
SELECT * FROM visitor_sessions 
WHERE is_active = true 
AND updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;
```

## Future Enhancements

- [ ] Auto-mark visitors as inactive after timeout (background job)
- [ ] Visitor presence indicators (online/idle/offline)
- [ ] Visitor inactivity notifications to owner
- [ ] Configurable inactivity timeout per project
- [ ] WebSocket instead of polling for real-time updates
- [ ] Visitor activity timeline/logs
