# Widget Security Implementation Guide

## Overview

This document outlines the security measures implemented for the embedded widget (script tag integration). The solution addresses three critical security concerns:

1. **Browser key exposure** - No API keys are exposed in the browser
2. **Domain validation** - Only allowed domains can use the widget
3. **Backend validation** - All requests are validated server-side
4. **Token lifecycle** - Short-lived JWT tokens (15 minutes) for secure authentication

## Security Architecture

### 1. Short-Lived JWT Tokens (Public Project Key)

**Problem:** Exposing the API key directly in the script tag or query parameters makes it vulnerable to theft and misuse.

**Solution:** 
- Use short-lived JWT tokens (15 minutes expiry) instead of permanent API keys
- Tokens are generated on-demand via the `/api/widget/token` endpoint
- The widget automatically requests a new token before each API call
- Tokens contain only the `projectId` and type information

**Implementation:**
```typescript
// In auth.ts
export function generateWidgetToken(projectId: string): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  return jwt.sign({ projectId, type: "widget" }, secret, { expiresIn: "15m" });
}

export function verifyWidgetToken(token: string): WidgetTokenPayload | null {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  return jwt.verify(token, secret) as WidgetTokenPayload;
}
```

### 2. Domain Allow-Listing

**Problem:** Without domain validation, anyone can use your widget on any website.

**Solution:**
- Store allowed domains in the `chatbotConfigs.allowedDomains` array
- Validate the request origin against the allowed domains list
- Support wildcards: `*.example.com` matches all subdomains
- Support localhost for development

**Data Structure:**
```json
{
  "allowedDomains": [
    "example.com",
    "app.example.com",
    "*.example.com",
    "localhost"
  ]
}
```

**Domain Validation Rules:**
- Exact match: `example.com` matches only `example.com`
- Subdomain wildcard: `*.example.com` matches `sub.example.com` and `sub.sub.example.com`
- Development: `localhost` and `127.0.0.1` always allowed in development

### 3. Backend Validation

**Problem:** Without backend validation, an attacker with a valid token could make requests from unauthorized origins.

**Solution:**
- Every widget API endpoint validates three things:
  1. Valid JWT token that hasn't expired
  2. Token's projectId matches the request's projectId
  3. Request origin is in the project's allowed domains list

**Implementation:**
```typescript
app.post("/api/widget/chat", async (req: any, res: any) => {
  const { projectId, token, sessionId, message } = req.body;
  const requestOrigin = req.headers.origin;

  // 1. Validate JWT token
  const tokenPayload = verifyWidgetToken(token);
  if (!tokenPayload || tokenPayload.projectId !== projectId) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // 2. Get project and validate existence
  const project = await storage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  // 3. Validate domain
  const config = await storage.getChatbotConfig(projectId);
  const allowedDomains = config?.allowedDomains as string[] | null || [];
  
  if (!validateDomain(requestOrigin, allowedDomains)) {
    return res.status(403).json({ message: "Domain not allowed" });
  }

  // ... proceed with chat logic
});
```

## API Endpoints

### 1. Widget Token Generation (Public)
```
POST /api/widget/token
Content-Type: application/json

Body:
{
  "projectId": "uuid-here",
  "origin": "https://example.com"  // Optional, header.origin used if not provided
}

Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900  // Seconds (15 minutes)
}

Error (403):
{
  "message": "Domain not allowed"
}
```

### 2. Widget Chat Endpoint (Public)
```
POST /api/widget/chat
Content-Type: application/json

Body:
{
  "projectId": "uuid-here",
  "token": "jwt-token-from-/api/widget/token",
  "sessionId": "optional-existing-session-id",
  "message": "User message here"
}

Response (200 OK):
{
  "sessionId": "uuid-here",
  "message": "AI response here",
  "sources": [
    {
      "documentName": "doc.pdf",
      "snippet": "Relevant text snippet..."
    }
  ]
}

Error (401):
{
  "message": "Invalid or expired token"
}

Error (403):
{
  "message": "Domain not allowed"
}
```

## Setup Instructions for End Users

### Step 1: Configure Allowed Domains

In the dashboard, navigate to Project Settings → Chatbot Configuration:

```
Allowed Domains:
- example.com
- app.example.com
- *.staging.example.com
```

Or via API:
```bash
curl -X PUT http://your-app.com/api/chatbot-config/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allowedDomains": [
      "example.com",
      "app.example.com",
      "*.staging.example.com"
    ]
  }'
```

### Step 2: Embed the Widget Script

Add this single line to your website (no API key needed!):

```html
<script async src="https://your-app.com/widget.js?projectId=YOUR_PROJECT_ID"></script>
```

That's it! The widget will:
1. Automatically request a token on the first interaction
2. Validate the domain before accepting requests
3. Refresh tokens automatically as needed

### Step 3: Test the Integration

1. Open your website in a browser
2. You should see the chat widget
3. Try sending a message - it should work
4. Check browser console for any validation errors

## Security Checklist

- [x] API keys are never exposed in browser
- [x] Tokens expire after 15 minutes
- [x] Token verification is required for all chat requests
- [x] Domain validation prevents cross-origin abuse
- [x] Invalid tokens are rejected with 401
- [x] Unauthorized domains are rejected with 403
- [x] Localhost allowed for development/testing
- [x] Origin header is validated on all requests
- [x] No sensitive data in JWT payload
- [x] CORS headers are set appropriately

## Development vs Production

### Development
- Localhost (127.0.0.1:3000) is automatically allowed
- Tokens still required but easier to test
- Check browser console for detailed error messages

### Production
- Only explicitly configured domains are allowed
- Remove localhost from allowed domains
- Use HTTPS only (set `secure: true` in cookie config)
- Monitor failed token requests for potential attacks

## Common Issues & Troubleshooting

### "Domain not allowed" Error
1. Check that your domain is in the allowed domains list
2. Ensure the domain matches exactly (example.com vs www.example.com)
3. For subdomains, use `*.example.com` or add each subdomain individually
4. Check for trailing slashes or protocol mismatches

### Token Expired (401)
1. The widget automatically refreshes tokens
2. If you see this error, check console logs
3. Ensure server time is synchronized (check NTP)
4. Verify `JWT_SECRET` is set consistently

### Script Not Loading
1. Verify projectId is correct in script URL
2. Check CORS headers in response
3. Ensure widget.js endpoint is accessible
4. Check browser developer tools for network errors

## Migration from Old API Key Method

If you're upgrading from the old `apiKey` method:

**Old (Insecure):**
```html
<script src="/widget.js?projectId=ID&apiKey=KEY"></script>
```

**New (Secure):**
```html
<script async src="/widget.js?projectId=ID"></script>
```

The widget automatically:
- No longer accepts apiKey parameter (ignored if provided)
- Requests tokens automatically
- Validates domains automatically

## Environment Variables

Ensure these are set:

```bash
# Required
JWT_SECRET=your-secret-key  # Or falls back to SESSION_SECRET
SESSION_SECRET=your-session-secret

# Optional (for development)
NODE_ENV=production  # Set to 'production' to disable localhost
```

## Monitoring & Logging

The system logs all widget security events:

```
[Widget] Token obtained, expires in 900s
[Widget] Domain validation failed for origin: https://evil.com
[Widget] Invalid or expired token
[Widget] Domain not allowed
```

Monitor these logs for:
- Repeated failed domain validations (potential abuse)
- Expired token errors (clock skew issues)
- Invalid token errors (attempted intrusions)

## Future Enhancements

Potential improvements for even better security:

1. **Rate Limiting** - Limit token requests per domain
2. **IP Whitelisting** - Optional IP-based restrictions
3. **Custom JWT Claims** - Add additional metadata to tokens
4. **Token Rotation** - Implement refresh token mechanism
5. **Widget API Key** - Project-specific key for server-side operations
6. **Audit Logging** - Detailed tracking of all widget usage
