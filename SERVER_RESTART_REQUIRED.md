# 🔧 Server Restart Required + Multiple File Upload Fix

## Current Status

### ❌ Problem 1: Server Running Old Code
The error messages show the server is still running the **OLD code** with the `bucket is not defined` error. The file changes were saved, but the server didn't reload.

**Evidence:**
```
Error loading counter: ReferenceError: bucket is not defined
    at loadCounter (D:\ClearBoard\server\server.js:212:22)
```

Line 212 in the error is the OLD code location. The NEW code has different line numbers.

### ❌ Problem 2: Multiple File Upload Timing
When uploading multiple files:
- First file: ✅ Works
- Subsequent files: ❌ Fail with "File not found after 3 attempts"

This happens because:
1. Files are uploaded sequentially (one after another)
2. GCS takes time to finalize each file
3. 3 seconds (3 retries × 1 second) isn't enough for some files

## Solutions

### Solution 1: Restart the Server ⚡ REQUIRED

**The server MUST be manually restarted:**

1. **Stop the server:**
   - Go to the terminal running `npm start`
   - Press `Ctrl+C`

2. **Start it again:**
   ```bash
   npm start
   ```

3. **Verify it started:**
   ```
   Using GCS bucket: clearboard
   Server running on port 8080
   System is fully cloud-based
   ```

### Solution 2: Increase Retry Parameters

I'll update the `getFileMetadata` call to use more retries and longer delays for better reliability.

**Current:**
```javascript
const metadata = await getFileMetadata(gcsObjectKey);
// Uses defaults: 3 retries, 1000ms delay = max 3 seconds
```

**Updated:**
```javascript
const metadata = await getFileMetadata(gcsObjectKey, 5, 2000);
// 5 retries, 2000ms delay = max 10 seconds
```

## Why Multiple Files Fail

### Upload Flow
1. Frontend uploads File 1 → Success ✅
2. Frontend uploads File 2 → GCS still processing File 1
3. Server tries to get File 2 metadata → Not ready yet
4. Retries 3 times (3 seconds) → Still not ready
5. Fails ❌

### The Fix
- **More retries**: 5 instead of 3
- **Longer delays**: 2 seconds instead of 1 second
- **Total wait time**: Up to 10 seconds instead of 3 seconds

This gives GCS enough time to finalize files, especially when uploading multiple files in quick succession.

## Implementation

I'll make the following change to `server.js`:

**Line 795** (in finishUpload function):
```javascript
// OLD:
const metadata = await getFileMetadata(gcsObjectKey);

// NEW:
const metadata = await getFileMetadata(gcsObjectKey, 5, 2000);
```

This increases:
- Retries: 3 → 5
- Delay: 1000ms → 2000ms
- Max wait: 3s → 10s

## Steps to Fix

### Step 1: Restart Server (CRITICAL)
```bash
# In server terminal:
Ctrl+C
npm start
```

### Step 2: Test Single File Upload
1. Go to Grid View
2. Upload ONE file
3. Should work ✅

### Step 3: Test Multiple File Upload
1. Select 2-3 files
2. Upload them
3. Should all succeed ✅

## Expected Results

### Before Fix:
```
❌ File 1: Success
❌ File 2: File not found after 3 attempts
❌ File 3: File not found after 3 attempts
```

### After Fix:
```
✅ File 1: Success (retry 0-1 times)
✅ File 2: Success (retry 1-2 times)
✅ File 3: Success (retry 1-2 times)
```

## Console Output

### Good Output:
```
File files/xxx.pdf not found yet, retrying (1/5)...
File files/xxx.pdf not found yet, retrying (2/5)...
POST /api/files/upload 200
✅ Upload complete
```

### Bad Output (if server not restarted):
```
Error loading counter: ReferenceError: bucket is not defined
POST /api/files/upload 500
```

## Troubleshooting

### If Still Getting "bucket is not defined"
→ **Server wasn't restarted properly**
- Make sure you pressed Ctrl+C in the correct terminal
- Wait for server to fully stop
- Run `npm start` again

### If Still Getting "File not found after X attempts"
→ **Increase retry parameters even more**
```javascript
const metadata = await getFileMetadata(gcsObjectKey, 10, 3000);
// 10 retries, 3 seconds each = 30 seconds max
```

### If Uploads Are Too Slow
→ **Retries add delay, but ensure reliability**
- This is expected behavior
- Better to be slow and reliable than fast and broken

## Summary

**Two fixes needed:**

1. ✅ **Restart Server** (CRITICAL - do this first!)
   - Ctrl+C in server terminal
   - `npm start`

2. ✅ **Increase Retry Parameters** (I'll do this now)
   - More retries: 3 → 5
   - Longer delay: 1s → 2s
   - Max wait: 3s → 10s

**After both fixes:**
- Single file uploads: ✅ Work
- Multiple file uploads: ✅ Work
- GCS eventual consistency: ✅ Handled

---

**Action Required**: **RESTART THE SERVER NOW!**

Then test uploading multiple files.
