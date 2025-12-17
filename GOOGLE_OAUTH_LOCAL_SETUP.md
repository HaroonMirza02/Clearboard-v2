# Google OAuth Local Testing - IMPORTANT SETUP

## The Problem

Your `GOOGLE_CALLBACK_URL` in `.env` is set to the **production URL**:
```
GOOGLE_CALLBACK_URL=https://backend-app-602854698306.asia-south1.run.app/api/auth/google/callback
```

But you're testing **locally** on `http://localhost:8080`, so Google is redirecting to production instead of your local server.

## The Solution

I've updated the code to automatically use `http://localhost:8080/api/auth/google/callback` for local development.

**BUT** you need to add this URL to your Google Cloud Console:

### Step-by-Step Instructions:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select your project (the one with client ID: `602854698306-s838b1aipnr28birq0ei26addg2feh3n`)

2. **Edit OAuth 2.0 Client:**
   - Click on your OAuth 2.0 Client ID
   - Find the "Authorized redirect URIs" section

3. **Add Local Callback URL:**
   - Click "ADD URI"
   - Add: `http://localhost:8080/api/auth/google/callback`
   - Click "SAVE"

4. **Restart Your Server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm start
   ```

5. **Test Again:**
   - Go to http://localhost:5173/login
   - Click "Continue with Google"
   - It should now work!

## What Changed in the Code

**File: `server/config/passport.js`**
- Now detects if running locally
- Automatically uses `http://localhost:8080/api/auth/google/callback` for local dev
- Uses production URL (`GOOGLE_CALLBACK_URL` from `.env`) for production

**You'll see this log when server starts:**
```
[Passport] Using callback URL: http://localhost:8080/api/auth/google/callback
```

## Current Authorized Redirect URIs

Your Google Cloud Console should have **BOTH** URLs:

1. ✅ **Production:** `https://backend-app-602854698306.asia-south1.run.app/api/auth/google/callback`
2. ⚠️ **Local (ADD THIS):** `http://localhost:8080/api/auth/google/callback`

## Alternative: Use ngrok for Local Testing

If you don't want to modify Google Cloud Console, you can use ngrok:

```bash
# Install ngrok (if not already installed)
# Then run:
ngrok http 8080
```

This will give you a public URL like `https://abc123.ngrok.io` that you can add to Google Cloud Console instead.

## After Adding the URL

1. **Restart your server** to see the new callback URL in logs
2. **Test the OAuth flow** - it should work now!
3. **Check server logs** for:
   ```
   [OAuth] Initiating Google authentication...
   [OAuth] Callback received from Google
   [OAuth] Authentication successful, processing user...
   ```

## Troubleshooting

**If you still see "Cannot GET /api/auth/google/callback":**
- Make sure you added the URL to Google Cloud Console
- Make sure you clicked "SAVE" in Google Cloud Console
- Restart your server
- Clear browser cache/cookies
- Try in incognito mode

**If you see "redirect_uri_mismatch" error:**
- The URL in Google Cloud Console doesn't match exactly
- Check for typos (http vs https, port number, etc.)
- Make sure there's no trailing slash

## Quick Test

After adding the URL and restarting:

1. Open browser console (F12)
2. Go to http://localhost:5173/login
3. Click "Continue with Google"
4. Watch the URL changes:
   - Should redirect to `accounts.google.com`
   - Then back to `http://localhost:8080/api/auth/google/callback`
   - Then to `http://localhost:5173/auth/callback?token=...`
   - Finally to `http://localhost:5173/dashboard`

---

**Once you add the localhost URL to Google Cloud Console and restart the server, everything will work!** 🚀
