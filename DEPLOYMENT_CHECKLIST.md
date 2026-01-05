# Implementation Checklist & Next Steps

## Pre-Deployment Checklist

### Code Changes
- [x] Added JWT token generation in `server/auth.ts`
- [x] Added domain validation in `server/auth.ts`
- [x] Created `/api/widget/token` endpoint
- [x] Updated `/api/widget/chat` endpoint with token validation
- [x] Updated `/widget.js` script with token management
- [x] Added `allowedDomains` field to schema
- [x] Updated chatbot config endpoint for domain management
- [x] Created database migration

### Dependencies
- [x] Added `jsonwebtoken` to package.json
- [x] Added `@types/jsonwebtoken` to package.json
- [x] Fixed pgvector type definition

### Documentation
- [x] Created `WIDGET_SECURITY.md` - Full documentation
- [x] Created `WIDGET_SECURITY_QUICK_REFERENCE.md` - Quick guide
- [x] Created `CODE_CHANGES.md` - Code reference
- [x] Created `IMPLEMENTATION_SUMMARY.md` - Summary

## Deployment Steps

### Step 1: Prepare Environment
```bash
# Update packages
npm install

# Apply database migration
npm run db:push

# Set environment variable
export JWT_SECRET="$(openssl rand -base64 32)"
export NODE_ENV=production
```

### Step 2: Test Locally
```bash
# Start dev server
npm run dev

# Open http://localhost:3000
# Test widget - should work without API key

# Check console logs for:
# ✅ [Widget] Token obtained, expires in 900s
# ✅ Chat messages working
```

### Step 3: Test on Staging
```bash
# Add staging domain to allowed domains
allowedDomains: ["staging.example.com", "*.staging.example.com"]

# Deploy to staging
git push staging

# Test widget on staging domain
# Should work without changes to script tag
```

### Step 4: Production Deployment
```bash
# Add production domains
allowedDomains: ["example.com", "*.example.com"]

# Deploy to production
git push production

# Verify:
# 1. Widget loads on your domain
# 2. Messages work
# 3. Check logs for errors
# 4. Monitor for security events
```

### Step 5: Update Documentation
- [ ] Update your website's widget integration docs
- [ ] Remove old API key documentation
- [ ] Update any client-side implementation guides
- [ ] Create internal security guidelines

## Verification Steps

### Local Testing
```bash
# 1. Test token generation
curl -X POST http://localhost:3000/api/widget/token \
  -H "Content-Type: application/json" \
  -d '{"projectId":"TEST_ID","origin":"http://localhost:3000"}'

# Should return: {"token":"...", "expiresIn":900}

# 2. Test with invalid domain
curl -X POST http://localhost:3000/api/widget/token \
  -H "Content-Type: application/json" \
  -d '{"projectId":"TEST_ID","origin":"http://evil.com"}'

# Should return 403: {"message":"Domain not allowed"}

# 3. Test widget on page
# Visit http://localhost:3000
# Open browser console (F12)
# Should see: [Widget] Token obtained, expires in 900s
# Click chat widget and send message
# Should work without errors
```

### Production Testing
```bash
# 1. Verify script URL
<script src="https://app.com/widget.js?projectId=YOUR_ID"></script>
# No apiKey parameter!

# 2. Check widget behavior
# Open website
# Widget should appear
# Sending message should work

# 3. Monitor logs
# Should see: [Widget] Token obtained
# Should NOT see: domain validation errors

# 4. Test domain blocking
# Try accessing from unauthorized domain
# Should see: [Widget] Domain validation failed
# Widget chat should fail with 403
```

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# Revert to previous version
git revert HEAD

# Clear token caches
redis-cli FLUSHALL  # If using Redis

# Restart application
npm run dev
```

### Keep Old & New Running
```bash
# Keep old /api/widget/chat endpoint
# Add new /api/widget/chat-v2 endpoint
# Update widget.js to use new endpoint
# Gradually migrate users
```

## Monitoring & Alerts

### Set Up Logging for:

```bash
# Monitor for failed domain validations
# Alert if > 10 failures in 5 minutes
ERROR_PATTERN: "Domain validation failed"

# Monitor for token issues
# Alert if token verification failures spike
ERROR_PATTERN: "Token verification error"

# Monitor for general widget errors
# Alert on any widget endpoint failures
ERROR_PATTERN: "Widget.*error|failed"
```

### Log Analysis Commands
```bash
# Find domain validation failures
grep "Domain validation failed" logs/* | wc -l

# Find token issues
grep "Token verification error" logs/* | wc -l

# Find all widget errors
grep "\[Widget\]" logs/* | grep -i error
```

## Security Verification

### Pre-Production Checklist

- [ ] JWT_SECRET is set and secure
- [ ] SESSION_SECRET is set
- [ ] NODE_ENV=production on production server
- [ ] HTTPS enabled (cookies secure: true)
- [ ] Database credentials secured
- [ ] Logging is enabled
- [ ] Error monitoring is active
- [ ] CORS headers are correct

### Security Testing

```bash
# 1. Test token expiry
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/widget/token \
  -H "Content-Type: application/json" \
  -d '{"projectId":"ID","origin":"http://localhost:3000"}' | jq -r .token)

# Wait 15 minutes or modify token
# Try to use expired token
curl -X POST http://localhost:3000/api/widget/chat \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"ID\",\"token\":\"$TOKEN\",\"message\":\"test\"}"

# Should return 401: {"message":"Invalid or expired token"}

# 2. Test domain validation
# Valid domain
curl -X POST http://localhost:3000/api/widget/token \
  -H "Content-Type: application/json" \
  -d '{"projectId":"ID","origin":"https://example.com"}'
# Should return token

# Invalid domain
curl -X POST http://localhost:3000/api/widget/token \
  -H "Content-Type: application/json" \
  -d '{"projectId":"ID","origin":"https://evil.com"}'
# Should return 403

# 3. Test token tampering
# Modify JWT token (change payload)
# Try to use modified token
# Should return 401

# 4. Test localhost bypass
# In development, should always work
# In production, should require explicit whitelist
```

## Monitoring Dashboard

Create alerts for:

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Domain validation failures | > 5/min | Check if under attack |
| Token generation errors | > 10/min | Check server health |
| Chat failures | > 1% | Investigate cause |
| Token expiry errors | > 20/min | Check server clock |

## Support Resources

### Documentation Files
1. **WIDGET_SECURITY.md** - Full documentation
2. **WIDGET_SECURITY_QUICK_REFERENCE.md** - Quick troubleshooting
3. **CODE_CHANGES.md** - Technical details
4. **IMPLEMENTATION_SUMMARY.md** - Overview

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Domain not allowed" | Add domain to allowedDomains list |
| Token not refreshing | Check browser console, increase buffer |
| Widget not loading | Verify projectId, check CORS headers |
| Chat failing silently | Check browser console, check server logs |

## Performance Metrics (Expected)

- Token generation: < 10ms
- Token verification: < 5ms
- Domain validation: < 2ms
- Total widget request overhead: < 20ms
- No noticeable impact on user experience

## Future Enhancements

Priority: High
- [ ] Rate limiting on token requests
- [ ] Audit logging for security events

Priority: Medium
- [ ] IP whitelisting
- [ ] Custom JWT claims
- [ ] Refresh token mechanism

Priority: Low
- [ ] Widget API key for server-side
- [ ] Analytics dashboard
- [ ] Advanced threat detection

## Post-Deployment Tasks

### Week 1
- [ ] Monitor logs daily
- [ ] Check for any errors
- [ ] Verify all domains working
- [ ] Performance baseline

### Week 2-4
- [ ] Monitor weekly
- [ ] Check for patterns
- [ ] Document any issues
- [ ] Plan optimizations

### Ongoing
- [ ] Monthly security review
- [ ] Quarterly threat assessment
- [ ] Annual architecture review
- [ ] Stay updated on JWT best practices

## Questions or Issues?

1. Check documentation files
2. Review code changes in CODE_CHANGES.md
3. Check server logs for errors
4. Test security verification steps
5. Contact security team if needed

## Sign-Off

- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Security verified
- [ ] Ready for production

---

**Implementation Status**: ✅ COMPLETE

All security features have been implemented and documented. Ready for deployment!
