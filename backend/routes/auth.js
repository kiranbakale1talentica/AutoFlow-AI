const express = require('express');
const passport = require('../config/passport');
const GitHubService = require('../services/githubService');
const Database = require('../models/database');
const pipelinePollingService = require('../services/pipelinePollingService');

const router = express.Router();
const database = new Database();

// Temporary storage for preserving main app sessions during GitHub OAuth
const tempSessionStorage = new Map();

// Debug endpoint to check GitHub OAuth configuration
router.get('/github/debug', (req, res) => {
  const env = require('../config/env');
  res.json({
    clientId: env.GITHUB_CLIENT_ID,
    callbackUrl: env.GITHUB_CALLBACK_URL,
    hasClientSecret: !!env.GITHUB_CLIENT_SECRET,
    secretLength: env.GITHUB_CLIENT_SECRET ? env.GITHUB_CLIENT_SECRET.length : 0
  });
});

// GitHub OAuth login
router.get('/github', (req, res, next) => {
  // Store the existing user session data before GitHub OAuth
  const existingUser = req.session.user;
  
  console.log('🔄 Starting GitHub OAuth flow');
  console.log('📝 Existing user session:', existingUser ? `${existingUser.email} (ID: ${existingUser.id})` : 'None');
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 Full session data:', JSON.stringify(req.session, null, 2));
  
  // If there's NO existing user session, redirect to login first
  if (!existingUser) {
    console.log('❌ No main app session found - redirecting to login first');
    return res.redirect('http://localhost:3000/login?error=Please login first before connecting GitHub');
  }
  
  // If there's an existing user, store it temporarily with a unique token
  let tempToken = null;
  if (existingUser) {
    tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tempSessionStorage.set(tempToken, existingUser);
    console.log('💾 Created temporary token for user preservation:', tempToken);
    
    // Clean up old temporary tokens (older than 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [token, userData] of tempSessionStorage.entries()) {
      if (token.startsWith('temp_') && parseInt(token.split('_')[1]) < tenMinutesAgo) {
        tempSessionStorage.delete(token);
      }
    }
  }
  
  // Only clear GitHub-specific session data, not the entire session
  if (req.session.githubToken) {
    delete req.session.githubToken;
  }
  if (req.session.githubUser) {
    delete req.session.githubUser;
  }
  
  // Force fresh authentication by adding prompt parameter
  const authOptions = { 
    scope: ['user:email', 'repo', 'admin:repo_hook']
  };
  
  // If prompt=login is requested, force re-authentication
  if (req.query.prompt === 'login') {
    authOptions.prompt = 'login';
  }
  
  // Add the temp token to the OAuth state parameter so we can retrieve it in callback
  if (tempToken) {
    authOptions.state = tempToken;
  }
  
  console.log('🚀 Proceeding with GitHub OAuth with state:', tempToken);
  passport.authenticate('github', authOptions)(req, res, next);
});

// GitHub disconnect endpoint
router.post('/github/disconnect', (req, res) => {
  try {
    console.log('🔌 Disconnecting GitHub for user:', req.session.user?.email || 'unknown');
    
    // Clear GitHub-specific session data
    delete req.session.githubUser;
    delete req.session.githubToken;
    
    // Keep the main app session intact
    res.json({
      success: true,
      message: 'GitHub account disconnected successfully'
    });
  } catch (error) {
    console.error('❌ GitHub disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect GitHub account'
    });
  }
});

// GitHub OAuth callback
router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Successful authentication
      console.log('✅ GitHub OAuth successful for user:', req.user.username);
      console.log('🔍 Session ID:', req.sessionID);
      
      // Try to restore existing user session from temporary storage
      const stateParam = req.query.state;
      let existingUser = null;
      
      if (stateParam && tempSessionStorage.has(stateParam)) {
        existingUser = tempSessionStorage.get(stateParam);
        tempSessionStorage.delete(stateParam); // Clean up after use
        console.log('✅ Retrieved existing user from temporary storage:', existingUser.email || existingUser.id);
      }
      
      // Also check session-based storage as fallback
      if (!existingUser && req.session.existingUser) {
        existingUser = req.session.existingUser;
        console.log('✅ Retrieved existing user from session storage:', existingUser.email || existingUser.id);
      }
      
      if (existingUser) {
        // Restore the main app user session FIRST
        req.session.user = existingUser;
        console.log('✅ Restored existing user session for:', existingUser.email || existingUser.id);
        
        // Then add GitHub OAuth data to session
        req.session.githubUser = req.user;
        req.session.githubToken = req.user.accessToken;
        
        console.log('🔗 GitHub integration added to existing session');
        console.log('🔍 Final session:', JSON.stringify({
          user: req.session.user,
          githubUser: req.session.githubUser ? { username: req.session.githubUser.username } : null
        }, null, 2));
      } else {
        // No existing user session - this should not happen in normal flow
        console.log('⚠️ No existing user session found during GitHub OAuth');
        
        // Still store GitHub data but user will need to login to main app
        req.session.githubUser = req.user;
        req.session.githubToken = req.user.accessToken;
      }
      
      // Clean up any temporary storage
      delete req.session.existingUser;
      
      // Force session save before redirect
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
        } else {
          console.log('💾 Session saved successfully');
        }
        
        // Set GitHub token for all user's pipelines in polling service
        (async () => {
          try {
            await database.connect();
            const pipelines = await database.getAllPipelines();
            const userPipelines = pipelines.filter(p => p.type === 'github');
            
            userPipelines.forEach(pipeline => {
              pipelinePollingService.setGitHubToken(pipeline.id, req.user.accessToken);
            });
            
            console.log(`🔑 Set GitHub tokens for ${userPipelines.length} pipelines`);
          } catch (error) {
            console.error('Error setting GitHub tokens for pipelines:', error);
          }
        })();
        
        // Redirect to frontend with success message
        const redirectUrl = existingUser ? 
          `http://localhost:3000/pipelines?auth=success&user=${encodeURIComponent(req.user.username)}` :
          `http://localhost:3000/login?github=success&user=${encodeURIComponent(req.user.username)}`;
        
        console.log('🔄 Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error('❌ GitHub OAuth callback error:', error);
      res.redirect('http://localhost:3000/dashboard?auth=error');
    }
  }
);

  // Get current user info
router.get('/user', (req, res) => {
  // Check for GitHub user in session
  if (req.session.githubUser && req.session.githubToken) {
    res.json({
      success: true,
      user: {
        id: req.session.githubUser.id,
        username: req.session.githubUser.username,
        displayName: req.session.githubUser.displayName,
        email: req.session.githubUser.email,
        avatarUrl: req.session.githubUser.avatarUrl,
        repos: req.session.githubUser.repos,
        accessToken: req.session.githubUser.accessToken // Include the access token
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});// Get user's GitHub repositories
router.get('/github/repositories', async (req, res) => {
  try {
    if (!req.session.githubToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication required'
      });
    }

    const githubService = new GitHubService(req.session.githubToken);
    const repositories = await githubService.getUserRepositories();
    
    // Check which repositories have workflows
    const reposWithWorkflows = await Promise.all(
      repositories.map(async (repo) => {
        try {
          const workflows = await githubService.getRepositoryWorkflows(repo.owner.login, repo.name);
          return {
            ...repo,
            hasWorkflows: workflows.length > 0,
            workflows: workflows
          };
        } catch (error) {
          return {
            ...repo,
            hasWorkflows: false,
            workflows: []
          };
        }
      })
    );

    res.json({
      success: true,
      repositories: reposWithWorkflows
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repositories',
      error: error.message
    });
  }
});

// Import a repository as a pipeline
router.post('/github/import-pipeline', async (req, res) => {
  try {
    if (!req.session.githubToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication required'
      });
    }

    const { repositoryId, repositoryName, repositoryUrl, workflowId } = req.body;

    if (!repositoryId || !repositoryName || !repositoryUrl) {
      return res.status(400).json({
        success: false,
        message: 'Repository ID, name, and URL are required'
      });
    }

    // Create webhook URL for this pipeline
    // In development, check for NGROK_URL environment variable
    const baseUrl = process.env.NGROK_URL || 'http://localhost:5000';
    const webhookUrl = `${baseUrl}/api/webhooks/github`;

    // Check if pipeline already exists with this repository URL
    await database.connect();
    const existingPipelines = await database.getAllPipelines();
    const existingPipeline = existingPipelines.find(p => 
      p.repository_url === repositoryUrl && p.type === 'github'
    );

    if (existingPipeline) {
      return res.status(409).json({
        success: false,
        message: 'A pipeline for this repository already exists',
        pipeline: existingPipeline
      });
    }

    // Create pipeline in database with unique name
    const pipeline = await database.createPipeline(
      `${repositoryName} (GitHub)`,
      'github',
      repositoryUrl,
      webhookUrl
    );

    // Create webhook on GitHub repository
    const githubService = new GitHubService(req.session.githubToken);
    const [owner, repo] = repositoryUrl.replace('https://github.com/', '').split('/');
    
    try {
      const webhook = await githubService.createWebhook(owner, repo, webhookUrl);
      console.log('✅ Created GitHub webhook:', webhook.id);
      
      // Update pipeline with GitHub-specific fields
      await database.updatePipelineGitHubFields(pipeline.id, repositoryId, workflowId, webhook.id);
      
      // Set GitHub token for polling service
      pipelinePollingService.setGitHubToken(pipeline.id, req.session.githubToken);
      
      // Sync workflow runs immediately after creating the pipeline
      try {
        const syncResult = await githubService.syncWorkflowRunsToDatabase(
          database, 
          pipeline.id, 
          owner, 
          repo, 
          workflowId, 
          30
        );
        console.log('✅ Synced workflow runs:', syncResult.syncedCount);
      } catch (syncError) {
        console.warn('⚠️ Failed to sync workflow runs:', syncError.message);
      }
    } catch (webhookError) {
      console.warn('⚠️ Failed to create webhook (pipeline still created):', webhookError.message);
    }

    // Get pipeline with execution stats
    const pipelineWithStats = await database.getPipelineWithStats(pipeline.id);

    res.status(201).json({
      success: true,
      message: 'Pipeline imported successfully',
      pipeline: pipelineWithStats
    });
  } catch (error) {
    console.error('Error importing pipeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import pipeline',
      error: error.message
    });
  }
});

// Get workflow runs for a repository
router.get('/github/workflow-runs/:owner/:repo', async (req, res) => {
  try {
    if (!req.session.githubToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication required'
      });
    }

    const { owner, repo } = req.params;
    const { workflowId, limit = 20 } = req.query;

    const githubService = new GitHubService(req.session.githubToken);
    const workflowRuns = await githubService.getWorkflowRuns(owner, repo, workflowId, parseInt(limit));

    res.json({
      success: true,
      workflowRuns: workflowRuns
    });
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow runs',
      error: error.message
    });
  }
});

// Sync workflow runs to executions
router.post('/github/sync-executions/:pipelineId', async (req, res) => {
  try {
    if (!req.session.githubToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication required'
      });
    }

    const { pipelineId } = req.params;
    const { limit = 10 } = req.body;

    // Get pipeline details
    await database.connect();
    const pipeline = await database.getPipelineById(pipelineId);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: 'Pipeline not found'
      });
    }

    // Extract owner/repo from repository URL
    const [owner, repo] = pipeline.repository_url.replace('https://github.com/', '').split('/');

    // Fetch recent workflow runs
    const githubService = new GitHubService(req.session.githubToken);
    const workflowRuns = await githubService.getWorkflowRuns(owner, repo, pipeline.github_workflow_id, limit);

    // Convert workflow runs to executions
    let syncedCount = 0;
    for (const run of workflowRuns) {
      try {
        // Map GitHub status/conclusion to our execution status
        let status = 'running';
        if (run.status === 'completed') {
          switch (run.conclusion) {
            case 'success':
              status = 'success';
              break;
            case 'failure':
            case 'timed_out':
            case 'action_required':
              status = 'failure';
              break;
            case 'cancelled':
              status = 'cancelled';
              break;
            default:
              status = 'failure';
          }
        }

        // Calculate build time
        let buildTime = null;
        if (run.runStartedAt && run.updatedAt && status !== 'running') {
          const startTime = new Date(run.runStartedAt);
          const endTime = new Date(run.updatedAt);
          buildTime = Math.floor((endTime - startTime) / 1000); // seconds
        }

        // Create execution record
        await database.createExecution(
          pipeline.id,
          status,
          run.runAttempt,
          buildTime,
          run.headSha,
          run.headCommit?.message || run.displayTitle,
          run.headBranch,
          `GitHub Actions Run: ${run.htmlUrl}`,
          run.runStartedAt ? new Date(run.runStartedAt).toISOString() : null,
          (status !== 'running' && run.updatedAt) ? new Date(run.updatedAt).toISOString() : null,
          run.id.toString() // external_id
        );

        syncedCount++;
      } catch (execError) {
        console.warn('Failed to sync execution:', execError.message);
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedCount} executions from GitHub`,
      syncedCount: syncedCount,
      totalRuns: workflowRuns.length
    });
  } catch (error) {
    console.error('Error syncing executions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync executions',
      error: error.message
    });
  }
});

// Force sync all pipelines with real-time data
router.post('/github/force-sync', async (req, res) => {
  try {
    if (!req.session.githubToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication required'
      });
    }

    await database.connect();
    const pipelines = await database.getAllPipelines();
    const githubPipelines = pipelines.filter(p => p.type === 'github' && p.is_active);

    let totalSynced = 0;
    const syncResults = [];

    for (const pipeline of githubPipelines) {
      try {
        // Set GitHub token for this pipeline
        pipelinePollingService.setGitHubToken(pipeline.id, req.session.githubToken);

        // Extract owner/repo from repository URL
        const repoMatch = pipeline.repository_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!repoMatch) {
          console.warn(`Invalid repository URL for pipeline ${pipeline.name}`);
          continue;
        }

        const [, owner, repo] = repoMatch;
        const cleanRepo = repo.replace('.git', '');

        const githubService = new GitHubService(req.session.githubToken);
        const syncResult = await githubService.syncWorkflowRunsToDatabase(
          database,
          pipeline.id,
          owner,
          cleanRepo,
          pipeline.github_workflow_id,
          50 // Get more recent runs
        );

        totalSynced += syncResult.syncedCount;
        syncResults.push({
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          syncedCount: syncResult.syncedCount
        });

        console.log(`✅ Force synced ${syncResult.syncedCount} runs for pipeline: ${pipeline.name}`);
      } catch (error) {
        console.error(`Error force syncing pipeline ${pipeline.name}:`, error);
        syncResults.push({
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Force sync completed. Total synced: ${totalSynced} executions across ${githubPipelines.length} pipelines`,
      totalSynced,
      pipelineCount: githubPipelines.length,
      results: syncResults
    });
  } catch (error) {
    console.error('Error in force sync:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force sync pipelines',
      error: error.message
    });
  }
});

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }
  next();
};

// Admin: Get all users
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const userDb = require('../models/userDatabase');
    const users = await userDb.getAllUsers();
    
    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        email_verified: user.email_verified,
        created_at: user.created_at,
        last_login: user.last_login
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Admin: Get user statistics
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const userDb = require('../models/userDatabase');
    const users = await userDb.getAllUsers();
    
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      verifiedUsers: users.filter(u => u.email_verified).length
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Admin: Create new user
router.post('/admin/create-user', requireAdmin, async (req, res) => {
  try {
    const { email, firstName, lastName, role } = req.body;
    
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, first name, and last name are required'
      });
    }
    
    const userDb = require('../models/userDatabase');
    
    // Check if user already exists
    const existingUser = await userDb.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Create user (admin-created users are automatically verified)
    const userId = await userDb.createUser(email, firstName, lastName);
    await userDb.verifyUser(userId);
    
    // Set role if specified
    if (role && role === 'admin') {
      await userDb.updateUserRole(userId, 'admin');
    }
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId: userId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user: ' + error.message
    });
  }
});

// Admin: Delete user
router.delete('/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.session.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    const userDb = require('../models/userDatabase');
    await userDb.deleteUser(userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Admin: Update user role
router.patch('/admin/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (user or admin) is required'
      });
    }
    
    // Prevent admin from demoting themselves
    if (parseInt(userId) === req.session.user.id && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }
    
    const userDb = require('../models/userDatabase');
    await userDb.updateUserRole(userId, role);
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
});

// Admin: Update user status (activate/deactivate)
router.put('/admin/users/:userId/status', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    // Prevent admin from deactivating themselves
    if (parseInt(userId) === req.session.user.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }
    
    const userDb = require('../models/userDatabase');
    await userDb.updateUserStatus(userId, isActive);
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Session destruction failed'
        });
      }
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

module.exports = router;
