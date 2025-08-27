// Simple authentication middleware
// In a real application, you would use JWT tokens or session management

const authEmailService = require('../services/authEmailService');

const authenticate = (req, res, next) => {
  if (!req.isAuthenticated()) {
    // Send authentication failure notification if email is available
    if (req.user?.email || req.session?.user?.email) {
      const userEmail = req.user?.email || req.session?.user?.email;
      authEmailService.sendAuthFailedNotification(userEmail, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        action: `${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.error('Failed to send auth failure email:', error);
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  next();
};

// GitHub-specific authentication middleware
const authenticateGitHub = (req, res, next) => {
  if (!req.session.githubToken) {
    return res.status(401).json({
      success: false,
      message: 'GitHub authentication required. Please connect your GitHub account.',
      action: 'connect_github'
    });
  }
  next();
};

const validatePipelineInput = (req, res, next) => {
  const { name, type, repository_url } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Pipeline name is required' 
    });
  }
  
  if (!type || type !== 'github') {
    return res.status(400).json({ 
      error: 'Pipeline type must be "github"' 
    });
  }
  
  if (!repository_url || repository_url.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Repository URL is required' 
    });
  }
  
  // Basic URL validation
  try {
    new URL(repository_url);
  } catch (e) {
    return res.status(400).json({ 
      error: 'Invalid repository URL format' 
    });
  }
  
  next();
};

const validateExecutionInput = (req, res, next) => {
  const { pipeline_id, status } = req.body;
  
  if (!pipeline_id || isNaN(parseInt(pipeline_id))) {
    return res.status(400).json({ 
      error: 'Valid pipeline ID is required' 
    });
  }
  
  if (!status || !['success', 'failure', 'running', 'cancelled'].includes(status)) {
    return res.status(400).json({ 
      error: 'Status must be one of: success, failure, running, cancelled' 
    });
  }
  
  next();
};

const validateAlertInput = (req, res, next) => {
  const { alert_type, webhook_url, email_address } = req.body;
  
  if (!alert_type || alert_type !== 'email') {
    return res.status(400).json({ 
      error: 'Alert type must be "email"' 
    });
  }

  if (!email_address || email_address.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Email address is required for email alerts' 
    });
  }  // Email validation if provided
  if (email_address) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_address)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
  }
  
  next();
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ 
      error: 'Email already exists' 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = {
  authenticate,
  authenticateGitHub,
  validatePipelineInput,
  validateExecutionInput,
  validateAlertInput,
  errorHandler
};
