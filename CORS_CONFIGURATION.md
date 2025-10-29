# Swagger CORS Configuration Guide

## Issue: "Failed to fetch" in Swagger UI

When testing endpoints in Swagger UI (`http://localhost:4000/api-docs`), you may see:
```
Failed to fetch.
Possible Reasons:
- CORS
- Network Failure
- URL scheme must be "http" or "https" for CORS request.
```

## ✅ Solution Applied

The CORS configuration has been updated to allow Swagger UI and external applications to access the API.

### Changes Made:

#### 1. Enhanced CORS Configuration (`src/index.ts`)

```typescript
// Enhanced CORS configuration for Swagger and external apps
app.use(cors({
  origin: '*', // Allow all origins for development (restrict in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));
```

**What this does:**
- `origin: '*'` - Allows requests from any domain (Swagger UI, external apps, etc.)
- `methods: [...]` - Allows all standard HTTP methods
- `allowedHeaders: [...]` - Allows common headers needed for API requests
- `credentials: true` - Allows cookies and authentication headers

#### 2. Multiple Server URLs in Swagger (`src/swagger.ts`)

```typescript
servers: [
  {
    url: 'http://localhost:4000',
    description: 'Local development server',
  },
  {
    url: 'https://studedatademo.azurewebsites.net',
    description: 'Production server (Azure)',
  },
]
```

**What this does:**
- Provides dropdown in Swagger UI to switch between local and production servers
- Ensures proper URL scheme (http/https) is used
- Makes testing easier across environments

## Testing the Fix

### 1. Start the Server
```bash
cd apps/server
pnpm run dev
```

### 2. Access Swagger UI
Open your browser: `http://localhost:4000/api-docs`

### 3. Test the Endpoint in Swagger
1. Navigate to **Students** section
2. Find `GET /api/students/by-student-id/{studentId}`
3. Click **Try it out**
4. Enter `student001` as the studentId
5. Click **Execute**

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response body with student data
- ✅ No CORS errors

### 4. Test with cURL (Alternative)
```bash
curl http://localhost:4000/api/students/by-student-id/student001
```

### 5. Test CORS Headers
```bash
curl -I http://localhost:4000/api/students/by-student-id/student001
```

**Expected Headers:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,Accept
Content-Type: application/json
```

## Production Deployment

⚠️ **Important:** Before deploying to production, restrict CORS origins for security:

```typescript
// Production CORS configuration
app.use(cors({
  origin: [
    'https://yourfrontend.com',
    'https://yourmobileapp.com',
    'https://studedatademo.azurewebsites.net'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));
```

Or use environment variables:

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));
```

## Troubleshooting

### Still Getting CORS Errors?

1. **Clear Browser Cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

2. **Check Server URL in Swagger**
   - Use the dropdown at the top of Swagger UI
   - Select `http://localhost:4000` for local testing

3. **Verify Server is Running**
   ```bash
   curl http://localhost:4000/
   ```

4. **Check for Proxy/Firewall Issues**
   - Disable browser extensions (especially ad blockers)
   - Try in incognito/private mode

5. **Verify CORS Headers**
   ```bash
   curl -v -H "Origin: http://localhost:3000" http://localhost:4000/api/students
   ```

### Browser Console Errors

If you see specific CORS errors in browser console:

**Error:** `No 'Access-Control-Allow-Origin' header is present`
- **Fix:** Restart the server to apply CORS configuration

**Error:** `CORS policy: Credentials flag is 'true', but the 'Access-Control-Allow-Credentials' header is ''`
- **Fix:** Already set with `credentials: true`

**Error:** `Method PUT is not allowed by Access-Control-Allow-Methods`
- **Fix:** Already includes PUT in methods array

## External Application Integration

With CORS properly configured, external applications can now access the API:

### JavaScript/React
```javascript
const response = await fetch('http://localhost:4000/api/students/by-student-id/student001');
const student = await response.json();
```

### Python
```python
import requests
response = requests.get('http://localhost:4000/api/students/by-student-id/student001')
student = response.json()
```

### Mobile Apps (React Native)
```javascript
fetch('http://10.0.2.2:4000/api/students/by-student-id/student001') // Android emulator
  .then(res => res.json())
  .then(data => console.log(data));
```

## Security Best Practices

1. **Development:**
   - Use `origin: '*'` for convenience
   - Keep credentials enabled for testing auth

2. **Production:**
   - Whitelist specific origins only
   - Use HTTPS (https://) URLs
   - Add rate limiting
   - Implement authentication/authorization
   - Log CORS-related errors

3. **Environment Variables:**
   ```env
   # .env.production
   ALLOWED_ORIGINS=https://portal.ueab.ac.ke,https://mobile.ueab.ac.ke
   NODE_ENV=production
   ```

## Summary

✅ **CORS is now properly configured** to allow:
- Swagger UI testing from browser
- External application integration
- Cross-origin requests from any domain (development mode)

✅ **Swagger UI is fully functional** with:
- Multiple server options (local/production)
- Complete API documentation
- Interactive endpoint testing
- Example requests and responses

✅ **Ready for external integration** with comprehensive documentation at:
- Interactive: `http://localhost:4000/api-docs`
- Markdown: `apps/server/API_DOCUMENTATION.md`

---

**Last Updated:** October 28, 2025
