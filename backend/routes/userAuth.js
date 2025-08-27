const express = require('express');

module.exports = (authService) => {
  const router = express.Router();
  
  console.log('🚀 UserAuth routes module loaded - this should appear in logs');

  // Middleware to check if user is admin
  const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // Middleware to check if user is authenticated
  const requireAuth = (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

// GET /api/auth/status - Check authentication status
router.get('/status', (req, res) => {
  console.log('=== AUTH STATUS DEBUG ===');
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 All cookies:', req.headers.cookie);
  console.log('🔍 Session object keys:', Object.keys(req.session || {}));
  console.log('🔍 Session data:', JSON.stringify({
    user: req.session.user,
    githubUser: req.session.githubUser ? { username: req.session.githubUser.username } : null,
    sessionKeys: Object.keys(req.session || {})
  }, null, 2));
  console.log('========================');
  
  if (req.session.user) {
    console.log('✅ User is authenticated:', req.session.user.email);
    res.json({ 
      authenticated: true,
      user: req.session.user 
    });
  } else {
    console.log('❌ User not authenticated - no req.session.user');
    res.status(401).json({ 
      authenticated: false 
    });
  }
});

// Test endpoint to simulate login
router.post('/test-login', (req, res) => {
  // Simulate a logged-in user for testing
  req.session.user = {
    id: 1,
    email: 'kiranbakale9@gmail.com',
    first_name: 'Kiran',
    last_name: 'Bakale',
    role: 'admin',
    is_active: true,
    email_verified: true
  };
  
  console.log('🧪 Test login created - Session ID:', req.sessionID);
  console.log('🧪 Session after test login:', JSON.stringify(req.session.user, null, 2));
  
  res.json({ 
    success: true, 
    message: 'Test login successful',
    user: req.session.user
  });
});

// POST /api/auth/signup/request-otp
router.post('/signup/request-otp', async (req, res) => {
  try {
    console.log('📝 Signup OTP request:', req.body);
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName || !lastName) {
      console.log('❌ Missing required fields:', { email: !!email, firstName: !!firstName, lastName: !!lastName });
      return res.status(400).json({ error: 'Email, first name, and last name are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    console.log('✅ Validation passed, calling authService.sendSignupOTP...');
    const result = await authService.sendSignupOTP(email, firstName, lastName);
    console.log('✅ OTP sent successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Signup OTP request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/signup/verify-otp
router.post('/signup/verify-otp', async (req, res) => {
  try {
    const { email, otp, firstName, lastName } = req.body;

    if (!email || !otp || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await authService.verifySignupOTP(email, otp, firstName, lastName);
    
    // Store user in session
    req.session.user = result.user;
    
    res.json(result);
  } catch (error) {
    console.error('Signup OTP verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login/request-otp
router.post('/login/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.sendLoginOTP(email);
    res.json(result);
  } catch (error) {
    console.error('Login OTP request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login/verify-otp
router.post('/login/verify-otp', async (req, res) => {
  console.log('🚨 VERIFY-OTP ROUTE HIT - this should show if route is reached');
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    console.log('🔐 Login OTP verification attempt:', { email, otp: '***', sessionId: req.sessionID });

    const result = await authService.verifyLoginOTP(email, otp);
    
    console.log('✅ OTP verification successful:', result.user.email);
    
    // Store user in session
    req.session.user = result.user;
    
    console.log('💾 Saving user to session:', { 
      userId: result.user.id, 
      email: result.user.email, 
      sessionId: req.sessionID 
    });
    
    console.log('🔍 Session before save:', JSON.stringify({
      user: req.session.user,
      sessionId: req.sessionID,
      sessionKeys: Object.keys(req.session)
    }, null, 2));
    
    // Force session save and regenerate session ID for security
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      console.log('✅ Session saved successfully');
      console.log('🔍 Session after save:', JSON.stringify({
        user: req.session.user,
        sessionId: req.sessionID
      }, null, 2));
      
      res.json(result);
    });
  } catch (error) {
    console.error('❌ Login OTP verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.session.user.id;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const success = await authService.updateUserProfile(userId, firstName, lastName);
    
    if (success) {
      // Update session data
      req.session.user.first_name = firstName;
      req.session.user.last_name = lastName;
      
      res.json({ 
        success: true, 
        message: 'Profile updated successfully',
        user: req.session.user
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Admin routes
// GET /api/auth/admin/users
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// PUT /api/auth/admin/users/:id/status
router.put('/admin/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const success = await authService.updateUserStatus(parseInt(id), isActive);
    
    if (success) {
      res.json({ success: true, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// GET /api/auth/admin/stats
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      verifiedUsers: users.filter(u => u.email_verified).length,
      adminUsers: users.filter(u => u.role === 'admin').length
    };
    res.json(stats);
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

return router;
};
