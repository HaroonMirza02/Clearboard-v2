# 🔧 Semantic Search Troubleshooting Guide

## ❌ Issue: "No documents found" for every search

This means the semantic search is not working properly. Let's fix it step by step.

## 🔍 Diagnosis Steps

### Step 1: Check if Server Has Semantic Search Code

The server MUST be restarted after adding the semantic search code. The current running server (started 1h38m ago) was started BEFORE we added the semantic search endpoints.

**✅ SOLUTION: Restart the server**

### Step 2: Verify Server Initialization

After restarting, you should see:
```
Server running on port 8080
Initializing semantic search service...
Initializing embedding model (all-MiniLM-L6-v2)...
Embedding model initialized successfully
✓ Semantic search service ready
```

If you DON'T see this, the semantic search service failed to initialize.

### Step 3: Check Browser Console

Open browser DevTools (F12) and look for:
```
[SemanticSearch] Searching for: your query
[SemanticSearch] API URL: http://localhost:8080/api/search
[SemanticSearch] Response status: 200
[SemanticSearch] Results received: X
```

## 🚀 IMMEDIATE FIX

### 1. Stop the Current Server

In the terminal running `npm start`:
- Press `Ctrl+C` to stop the server

### 2. Restart the Server

```bash
cd server
npm start
```

### 3. Wait for Initialization

You should see:
```
Server running on port 8080
...
Initializing semantic search service...
Initializing embedding model (all-MiniLM-L6-v2)...
```

**⏱️ First-time initialization takes 1-2 minutes** to download the embedding model (~90MB).

### 4. Verify Initialization Success

Look for:
```
✓ Semantic search service ready
```

If you see this, the semantic search is ready!

### 5. Upload Test Documents

1. Go to your dashboard
2. Upload these files:
   - `server/test-documents/machine_learning_guide.txt`
   - `server/test-documents/web_development_guide.txt`

3. Check server logs for:
```
[Auto-Index] Starting background indexing for machine_learning_guide.txt
[Auto-Index] Successfully indexed machine_learning_guide.txt
```

### 6. Test Search

1. Type in semantic search bar: "neural networks"
2. Check browser console (F12) for logs
3. You should see results!

## 🐛 Common Issues

### Issue 1: Server Won't Start

**Error**: "address already in use"

**Solution**:
1. Find the process using port 8080:
   ```powershell
   netstat -ano | findstr :8080
   ```
2. Kill the process:
   ```powershell
   taskkill /PID <process_id> /F
   ```
3. Restart server

### Issue 2: Model Download Fails

**Error**: "Failed to initialize embedding model"

**Causes**:
- No internet connection
- Insufficient disk space (~200MB needed)
- Firewall blocking download

**Solution**:
1. Check internet connection
2. Check disk space
3. Try again - download will resume

### Issue 3: No Files Being Indexed

**Check server logs** for:
```
[Auto-Index] Starting background indexing...
```

If you DON'T see this:
1. Files might not be supported format (need PDF, DOCX, or TXT)
2. Upload might have failed
3. Check server logs for errors

**Solution**:
- Re-upload files
- Check file format
- Check server logs for errors

### Issue 4: Search Returns 401 Unauthorized

**Error**: "Search failed with status 401"

**Cause**: No authentication token or expired token

**Solution**:
1. Log out and log back in
2. Check localStorage for 'token'
3. Verify token is being sent in request headers

### Issue 5: Search Returns 500 Internal Server Error

**Error**: "Search failed with status 500"

**Cause**: Server error during search

**Solution**:
1. Check server logs for error details
2. Verify semantic search service initialized
3. Check if vector store is accessible

## 🧪 Testing Script

Run this in browser console (F12) to test the endpoint:

```javascript
const testSearch = async () => {
  const token = localStorage.getItem('token');
  console.log('Token:', token ? 'Present ✓' : 'Missing ✗');
  
  const response = await fetch('http://localhost:8080/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: 'test',
      topK: 5
    })
  });
  
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Data:', data);
};

testSearch();
```

**Expected output**:
```
Token: Present ✓
Status: 200
Data: { success: true, query: "test", results: [...], totalResults: X }
```

## ✅ Verification Checklist

Before searching, verify:

- [ ] Server restarted after adding semantic search code
- [ ] Server logs show "✓ Semantic search service ready"
- [ ] Test documents uploaded (machine_learning_guide.txt, web_development_guide.txt)
- [ ] Server logs show "[Auto-Index] Successfully indexed..."
- [ ] Browser console shows no errors
- [ ] Token present in localStorage
- [ ] Network tab shows POST to /api/search with 200 status

## 📊 Expected Behavior

### When Search Works:

1. **Type query**: "neural networks"
2. **Browser console shows**:
   ```
   [SemanticSearch] Searching for: neural networks
   [SemanticSearch] API URL: http://localhost:8080/api/search
   [SemanticSearch] Response status: 200
   [SemanticSearch] Results received: 2
   ```
3. **Dropdown shows**: 2 results with snippets
4. **File list shows**: Only matching files

### When Search Doesn't Work:

1. **Type query**: "neural networks"
2. **Browser console shows**:
   ```
   [SemanticSearch] Searching for: neural networks
   [SemanticSearch] API URL: http://localhost:8080/api/search
   [SemanticSearch] Response status: 404 (or 500)
   [SemanticSearch] Error response: {...}
   ```
3. **Dropdown shows**: "No documents found"

## 🎯 Most Likely Cause

**The server was NOT restarted after adding semantic search code.**

The server you're currently running was started BEFORE we implemented the semantic search feature. It doesn't have the `/api/search` endpoint.

## 🔄 SOLUTION (90% of cases)

```bash
# 1. Stop current server (Ctrl+C in server terminal)

# 2. Restart server
cd server
npm start

# 3. Wait for "✓ Semantic search service ready"

# 4. Upload test files

# 5. Try searching again
```

## 📞 Still Not Working?

If after restarting the server it still doesn't work:

1. **Check server logs** - Look for errors during initialization
2. **Check browser console** - Look for network errors
3. **Verify endpoint exists** - Run the test script above
4. **Check file indexing** - Verify files were indexed successfully
5. **Try simple query** - Search for "test" or "document"

## 💡 Quick Debug Commands

### Check if server is running:
```powershell
Test-NetConnection localhost -Port 8080
```

### Check server logs:
Look at the terminal running `npm start`

### Check browser network tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Type a search query
4. Look for POST request to `/api/search`
5. Check status code and response

### Check localStorage:
```javascript
console.log('Token:', localStorage.getItem('token'));
console.log('Role:', localStorage.getItem('role'));
console.log('UserId:', localStorage.getItem('userId'));
```

## 🎉 Success Indicators

When everything works, you'll see:

✅ Server logs: "✓ Semantic search service ready"  
✅ Server logs: "[Auto-Index] Successfully indexed..."  
✅ Browser console: "Results received: X"  
✅ Dropdown: Shows results with snippets  
✅ File list: Updates to show only matching files  

---

**TL;DR**: **RESTART THE SERVER** - That's the fix 90% of the time!

```bash
# In server terminal:
Ctrl+C
npm start
# Wait for "✓ Semantic search service ready"
```
