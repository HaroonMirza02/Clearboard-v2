# IMMEDIATE FIX for Google OAuth "redirect_uri_mismatch" Error

## The Problem
Google is rejecting the OAuth request because `http://localhost:8080/api/auth/google/callback` is not authorized in your Google Cloud Console.

## QUICK FIX (Choose One):

### Option 1: Add localhost to Google Cloud Console (RECOMMENDED)

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Find your OAuth 2.0 Client ID:** `602854698306-s838b1aipnr28birq0ei26addg2feh3n`
3. **Click on it to edit**
4. **Scroll to "Authorized redirect URIs"**
5. **Click "ADD URI"**
6. **Add:** `http://localhost:8080/api/auth/google/callback`
7. **Click "SAVE"** at the bottom
8. **Wait 1-2 minutes** for changes to propagate
9. **Restart your server** and try again

### Option 2: Use Production URL for Local Testing (TEMPORARY WORKAROUND)

Add this to your `server/.env` file:

```env
# Add this line at the end
USE_PRODUCTION_OAUTH=true
```

Then update `server/config/passport.js` to always use production URL when this is set.

---

## Detailed Steps for Option 1 (RECOMMENDED):

### Step 1: Open Google Cloud Console
- URL: https://console.cloud.google.com/apis/credentials
- Make sure you're logged in with the account that created the OAuth client

### Step 2: Find Your OAuth Client
- Look for: "OAuth 2.0 Client IDs"
- Find the one with ID: `602854698306-s838b1aipnr28birq0ei26addg2feh3n`
- Click on the name to open it

### Step 3: Add Redirect URI
You should see a section called **"Authorized redirect URIs"**

Currently it probably has:
```
https://backend-app-602854698306.asia-south1.run.app/api/auth/google/callback
```

**Add this new URI:**
```
http://localhost:8080/api/auth/google/callback
```

**IMPORTANT:** 
- Make sure it's `http://` (not `https://`)
- Make sure the port is `8080`
- Make sure there's NO trailing slash
- Make sure it's exactly: `http://localhost:8080/api/auth/google/callback`

### Step 4: Save Changes
- Click the **"SAVE"** button at the bottom
- Wait 1-2 minutes for Google to propagate the changes

### Step 5: Restart Server
```bash
# In your server terminal (Ctrl+C to stop)
npm start
```

### Step 6: Test Again
1. Go to: http://localhost:5173/login
2. Click "Continue with Google"
3. Should work now! ✅

---

## What You Should See After Fix:

### In Server Logs:
```
[Passport] Using callback URL: http://localhost:8080/api/auth/google/callback
[OAuth] Initiating Google authentication...
GET /api/auth/google 302 4.564 ms - 0
[OAuth] Callback received from Google
[OAuth] Authentication successful, processing user...
```

### In Browser:
1. Click "Continue with Google"
2. Redirects to Google sign-in
3. Select your account
4. Redirects back to `localhost:8080/api/auth/google/callback`
5. Redirects to `localhost:5173/auth/callback?token=...`
6. Redirects to dashboard ✅

---

## Screenshot Guide

When you open your OAuth client in Google Cloud Console, you should see:

**Authorized redirect URIs:**
```
1. https://backend-app-602854698306.asia-south1.run.app/api/auth/google/callback
2. http://localhost:8080/api/auth/google/callback  ← ADD THIS
```

---

## Still Getting Error?

### Check These:

1. **Exact URL Match:**
   - Copy this exactly: `http://localhost:8080/api/auth/google/callback`
   - No extra spaces, no trailing slash

2. **Wait Time:**
   - After saving in Google Cloud Console, wait 1-2 minutes
   - Google needs time to propagate the changes

3. **Clear Browser Cache:**
   - Try in incognito/private mode
   - Or clear cookies for `accounts.google.com`

4. **Check Server Port:**
   - Make sure your server is running on port 8080
   - Check the server startup log: "Server running on port 8080"

5. **Restart Everything:**
   - Stop server (Ctrl+C)
   - Start server (`npm start`)
   - Refresh browser
   - Try again

---

## Need Help?

If you're still stuck, send me:
1. Screenshot of your "Authorized redirect URIs" section in Google Cloud Console
2. The exact error message from Google
3. Server logs when you try to sign in

**Once you add the localhost URL to Google Cloud Console, it will work!** 🚀
