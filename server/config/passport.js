const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Import user management functions from server.js
// We'll pass these as dependencies to avoid circular imports

let userManagement = null;

// Initialize passport with user management functions
function initializePassport(getAllUsersFn, loadUsersFn, saveUsersFn) {
    userManagement = {
        getAllUsers: getAllUsersFn,
        loadUsers: loadUsersFn,
        saveUsers: saveUsersFn
    };

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const allUsers = await userManagement.getAllUsers();
            const user = allUsers.find(u => u.id === id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // Determine callback URL based on environment
    // For local development, use localhost; for production, use the env variable
    const isLocalDev = process.env.NODE_ENV !== 'production' &&
        !process.env.GOOGLE_CALLBACK_URL?.includes('localhost');

    const callbackURL = isLocalDev
        ? 'http://localhost:8080/api/auth/google/callback'
        : process.env.GOOGLE_CALLBACK_URL;

    console.log('[Passport] Using callback URL:', callbackURL);

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: callbackURL,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user already exists with googleId
                    const allUsers = await userManagement.getAllUsers();
                    let user = allUsers.find(u => u.googleId === profile.id);

                    if (user) {
                        // User exists with this Google ID
                        return done(null, user);
                    }

                    // Check if user exists with same email
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                    if (email) {
                        user = allUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

                        if (user) {
                            // Link Google account to existing user
                            const registeredUsers = await userManagement.loadUsers();
                            const userIndex = registeredUsers.findIndex(u => u.id === user.id);

                            if (userIndex !== -1) {
                                registeredUsers[userIndex].googleId = profile.id;
                                await userManagement.saveUsers(registeredUsers);
                                user.googleId = profile.id;
                            }

                            return done(null, user);
                        }
                    }

                    // Create new user
                    const registeredUsers = await userManagement.loadUsers();
                    const id = 'user-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

                    const newUser = {
                        userId: profile.displayName.replace(/\s+/g, ''),
                        email: email,
                        googleId: profile.id,
                        id,
                        role: 'user',
                        department: 'Software Development', // Default, will be updated
                        createdAt: new Date().toISOString()
                    };

                    registeredUsers.push(newUser);
                    await userManagement.saveUsers(registeredUsers);

                    done(null, newUser);
                } catch (err) {
                    console.error('Google OAuth error:', err);
                    done(err, null);
                }
            }
        )
    );
}

module.exports = { passport, initializePassport };
