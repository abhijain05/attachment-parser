# Widget Security - Quick Reference

## What Changed

Your widget is now secure! Here's what we implemented:

### Before (Insecure ❌)
```html
<!-- API key exposed in URL - anyone can steal it! -->
<script src="/widget.js?projectId=ID&apiKey=SECRET_KEY"></script>
```

### After (Secure ✅)
```html
<!-- No keys needed - automatic token management -->
<script async src="/widget.js?projectId=ID"></script>
```

## Key Features

### 1. Short-Lived Tokens (15 min)
- Widget automatically requests fresh tokens
- Tokens expire after 15 minutes
- No keys stored in browser

### 2. Domain Validation
- Only whitelisted domains can use widget
- Configure in Project Settings
- Supports wildcards: `*.example.com`

### 3. Backend Validation
- Every request validated server-side
- Token must be valid
- Origin must be whitelisted
- Missing any = request rejected

## Setup (5 Minutes)

### Step 1: Add Allowed Domains
```bash
# Via API
curl -X PUT https://your-app.com/api/chatbot-config/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allowedDomains": [
      "example.com",
      "*.example.com"
    ]
  }'
```

Or in Dashboard: Project Settings → Chatbot Config → Allowed Domains

### Step 2: Add Script to Website
```html
<script async src="https://your-app.com/widget.js?projectId=YOUR_PROJECT_ID"></script>
```

### Step 3: Test It
1. Reload website
2. Click chat widget
3. Send a message
4. Should work! ✅

## Testing

### Development (Localhost)
```html
<script src="http://localhost:3000/widget.js?projectId=ID"></script>
```
- Automatically works
- No domain whitelist needed
- Perfect for testing

### Production (Live Site)
```html
<script src="https://app.example.com/widget.js?projectId=ID"></script>
```
- Requires domain in whitelist
- Use HTTPS only
- Monitor for errors

## Allowed Domains Format

| Domain | Matches |
|--------|---------|
| `example.com` | Only example.com |
| `app.example.com` | Only app.example.com |
| `*.example.com` | All subdomains (api.example.com, app.example.com, etc) |
| `*.staging.example.com` | All staging subdomains |
| `localhost` | Development only |

## Security Comparison

| Aspect | Old Method | New Method |
|--------|-----------|-----------|
| API Key Exposed | ❌ Yes (in URL) | ✅ No |
| Key Stealing | ❌ Possible | ✅ Prevented |
| Token Expiry | ❌ None | ✅ 15 min |
| Domain Validation | ❌ No | ✅ Yes |
| Backend Validation | ⚠️ Weak | ✅ Strong |

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Domain not allowed" | Not in whitelist | Add domain to allowed list |
| "Invalid or expired token" | Token expired | Widget auto-refreshes, try again |
| "Project not found" | Wrong projectId | Check projectId in script URL |

## Logging

Watch these logs for issues:

```
[Widget] Token obtained, expires in 900s  ← Good
[Widget] Domain validation failed  ← Check whitelist
[Widget] Invalid or expired token  ← Server time sync issue
```

## Troubleshooting

### Widget shows but doesn't work
1. Check browser console (F12)
2. Look for security errors
3. Verify domain in whitelist
4. Check server logs

### "Domain not allowed" on localhost
- Add `localhost` to allowed domains
- Or add `127.0.0.1`
- Development mode auto-allows both

### Script not loading
1. Check projectId is correct
2. Check script URL is accessible
3. Verify CORS headers present
4. Check browser network tab

## API Details

### Get Token
```
POST /api/widget/token
{
  "projectId": "uuid",
  "origin": "https://example.com"
}
→ { "token": "...", "expiresIn": 900 }
```

### Send Message
```
POST /api/widget/chat
{
  "projectId": "uuid",
  "token": "jwt-token",
  "sessionId": "optional",
  "message": "hello"
}
→ { "sessionId": "...", "message": "...", "sources": [...] }
```

## Environment Setup

Required on server:

```bash
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
NODE_ENV=production  # Disables localhost in production
```

## What's Protected Now

✅ API keys not exposed  
✅ Tokens expire quickly  
✅ Domain validation prevents abuse  
✅ Backend validates every request  
✅ Stolen tokens become useless after 15min  
✅ Cross-site attacks blocked  

## Migration Notes

If upgrading from old version:

1. Remove `&apiKey=...` from script URL
2. Add allowed domains to config
3. Redeploy widget script
4. Old `apiKey` parameter ignored automatically

That's it! Your widget is now production-ready and secure.
