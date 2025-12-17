# Google OAuth Implementation Guide

## Overview
Google OAuth authentication has been successfully integrated into both the Login and Signup pages. Users can now sign in using their Google account as an alternative to traditional email/password authentication.

## Features Implemented

### 1. **Backend Implementation**

#### Packages Installed
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth 2.0 strategy
- `express-session` - Session management

#### Files Created/Modified

**New Files:**
- `server/config/passport.js` - Passport configuration with Google OAuth strategy
  - Handles user serialization/deserialization
  - Links Google accounts to existing users by email
  - Creates new users for first-time Google sign-ins

**Modified Files:**
- `server/routes/auth.js` - Added Google OAuth routes:
  - `GET /api/auth/google` - Initiates Google authentication
  - `GET /api/auth/google/callback` - Handles OAuth callback
  - `POST /api/auth/update-department` - Updates user department after OAuth

- `server/models/User.js` - Updated User schema:
  - Added `googleId` field for Google OAuth users
  - Made `passwordHash` optional (Google users don't need passwords)

- `server/server.js` - Added middleware:
  - Express session middleware
  - Passport initialization
  - Mounted auth routes at `/api/auth`

#### Environment Variables
The following environment variables are already configured in `.env`:
```
GOOGLE_CLIENT_ID=602854698306-s838b1aipnr28birq0ei26addg2feh3n.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://backend-app-602854698306.asia-south1.run.app/api/auth/google/callback
SESSION_SECRET=09bb5a6fdcd4bab6183b9d8279aed802
```

### 2. **Frontend Implementation**

#### Files Created

**Components:**
- `src/components/GoogleSignInButton.jsx` - Reusable Google Sign-In button
  - Official Google branding with SVG icon
  - Handles OAuth flow initiation
  - Supports department pre-selection

**Pages:**
- `src/pages/AuthCallback.jsx` - OAuth callback handler
  - Processes authentication response from Google
  - Stores JWT token and user data
  - Redirects to appropriate dashboard

- `src/pages/SelectDepartment.jsx` - Department selection page
  - Shown to new Google OAuth users
  - Allows selection between Software Development and Business Development
  - Completes user registration

#### Files Modified

- `src/components/Login.jsx` - Added Google Sign-In button with OR divider
- `src/components/Signup.jsx` - Added Google Sign-In button with OR divider
- `src/utils/api.js` - Added Google OAuth endpoints
- `src/styles/auth.css` - Added styles for:
  - Google Sign-In button (official Google design)
  - OR divider
  - Loading spinner
- `src/main.jsx` - Added routes for OAuth callback and department selection

## User Flow

### For New Users (Signup with Google)
1. User clicks "Continue with Google" on Signup page
2. Redirected to Google's OAuth consent screen
3. After Google authentication:
   - If first-time user → Redirected to department selection page
   - User selects department (Software Development or Business Development)
   - Account created and redirected to dashboard
4. JWT token stored in localStorage
5. Session expires after 15 minutes (same as regular login)

### For Existing Users (Login with Google)
1. User clicks "Continue with Google" on Login page
2. Redirected to Google's OAuth consent screen
3. After Google authentication:
   - If Google account linked to existing user → Direct login
   - If email matches existing user → Google account linked automatically
   - Redirected to appropriate dashboard (admin or user)
4. JWT token stored in localStorage
5. Session expires after 15 minutes

### Account Linking
- If a user signs up with email/password first, then later uses Google OAuth with the same email, the accounts are automatically linked
- The `googleId` is added to their existing user record
- They can then use either method to log in

## Security Features

1. **Secure Session Management**
   - HTTP-only cookies in production
   - Session secret from environment variables
   - 24-hour session expiration

2. **JWT Token Security**
   - Tokens expire after 15 minutes
   - Stored in localStorage with expiry timestamp
   - Auto-logout on expiration

3. **OAuth Security**
   - Uses official Google OAuth 2.0 flow
   - Callback URL validated by Google
   - Client secret stored securely in environment variables

4. **CORS Protection**
   - Allowed origins configured
   - Credentials enabled for OAuth flow

## Testing

### Local Testing
1. Start backend: `npm start` in `server/` directory
2. Start frontend: `npm run dev` in root directory
3. Navigate to http://localhost:5173/login or /signup
4. Click "Continue with Google"
5. Sign in with your Google account
6. Verify redirect to dashboard

### Production Testing
1. Ensure environment variables are set on server
2. Deploy backend to Cloud Run
3. Deploy frontend to Firebase
4. Test OAuth flow end-to-end
5. Verify callback URL matches production URL

## Troubleshooting

### Common Issues

**Issue: "Redirect URI mismatch"**
- Solution: Ensure `GOOGLE_CALLBACK_URL` in `.env` matches the authorized redirect URI in Google Cloud Console

**Issue: Session not persisting**
- Solution: Check that `SESSION_SECRET` is set and cookies are enabled

**Issue: Department not saving**
- Solution: Verify `/api/auth/update-department` endpoint is working and user ID is being passed correctly

**Issue: Infinite redirect loop**
- Solution: Clear localStorage and cookies, then try again

## API Endpoints

### Google OAuth Endpoints

#### Initiate Authentication
```
GET /api/auth/google?department=Software%20Development
```
- Starts Google OAuth flow
- Optional `department` query parameter for pre-selection

#### OAuth Callback
```
GET /api/auth/google/callback
```
- Handles Google's OAuth response
- Creates/links user account
- Redirects to frontend with token

#### Update Department
```
POST /api/auth/update-department
Content-Type: application/json

{
  "userId": "user-id-here",
  "department": "Software Development"
}
```
- Updates user's department after OAuth
- Returns JWT token

## Design & UX

### Google Sign-In Button
- Follows Google's official branding guidelines
- Includes Google's 4-color logo
- Subtle hover and active states
- Full-width for consistency

### OR Divider
- Clean horizontal line with centered text
- Separates OAuth from traditional login
- Matches overall design system

### Loading States
- Spinner animation during OAuth flow
- Clear feedback messages
- Error handling with user-friendly messages

## Future Enhancements

1. **Additional OAuth Providers**
   - Microsoft/Azure AD
   - GitHub
   - LinkedIn

2. **Profile Picture**
   - Fetch and display Google profile picture
   - Store in user model

3. **Email Verification**
   - Skip OTP for Google-verified emails
   - Trust Google's email verification

4. **Admin Controls**
   - View OAuth-linked accounts
   - Unlink Google accounts
   - Force re-authentication

## Conclusion

The Google OAuth implementation is production-ready, secure, and provides a seamless user experience. Users can now sign in with their Google account on both Login and Signup pages, with automatic account linking and department selection for new users.
