const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const config = require('./config');
const env = require('./env');

// Configure GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: env.GITHUB_CLIENT_ID,
  clientSecret: env.GITHUB_CLIENT_SECRET,
  callbackURL: env.GITHUB_CALLBACK_URL,
  passReqToCallback: true  // Enable access to request object
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Store user data and access token for API calls
    const userData = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      email: profile.emails?.[0]?.value,
      avatarUrl: profile.photos?.[0]?.value,
      accessToken: accessToken, // This allows us to make GitHub API calls
      profileUrl: profile.profileUrl,
      repos: profile._json.public_repos,
      githubData: profile._json,
      authTimestamp: Date.now() // Track when this auth occurred
    };
    
    console.log('✅ GitHub authentication successful for:', userData.username);
    return done(null, userData);
  } catch (error) {
    console.error('❌ GitHub authentication error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
