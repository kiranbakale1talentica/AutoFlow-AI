const express = require('express');
const router = express.Router();
const Database = require('../models/database');
const database = new Database();
const { authenticate, authenticateGitHub, validatePipelineInput, validateExecutionInput, validateAlertInput } = require('../middleware/auth');
const GitHubService = require('../services/githubService');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CI/CD Pipeline Health Dashboard API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Pipeline Management APIs
router.get('/pipelines', async (req, res, next) => {
  try {
    // Ensure database is connected
    await database.connect();
    const pipelines = await database.getAllPipelines();
    res.status(200).json(pipelines);
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.get('/pipelines/:id', async (req, res, next) => {
  try {
    const pipeline = await database.getPipelineById(req.params.id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.status(200).json(pipeline);
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.post('/pipelines', validatePipelineInput, async (req, res, next) => {
  try {
    const { name, type, repository_url, webhook_url } = req.body;
    
    // Check for duplicate pipeline name
    const existingPipeline = await database.getAllPipelines();
    if (existingPipeline.some(p => p.name === name)) {
      return res.status(409).json({ error: 'Pipeline with this name already exists' });
    }
    
    const pipeline = await database.createPipeline(name, type, repository_url, webhook_url);
    
    // Broadcast to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'pipeline_created',
            data: pipeline
          }));
        }
      });
    }
    
    res.status(201).json(pipeline);
  } catch (error) {
    console.error('Error creating pipeline:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Pipeline with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.put('/pipelines/:id', validatePipelineInput, async (req, res, next) => {
  try {
    const { name, type, repository_url, webhook_url, is_active } = req.body;
    const result = await database.updatePipeline(
      req.params.id, 
      name, 
      type, 
      repository_url, 
      webhook_url, 
      is_active
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const updatedPipeline = await database.getPipelineById(req.params.id);
    
    // Broadcast to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'pipeline_updated',
            data: updatedPipeline
          }));
        }
      });
    }
    
    res.status(200).json(updatedPipeline);
  } catch (error) {
    console.error('Error updating pipeline:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.delete('/pipelines/:id', async (req, res, next) => {
  try {
    const result = await database.deletePipeline(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Broadcast to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'pipeline_deleted',
            data: { id: req.params.id }
          }));
        }
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Execution Tracking APIs
router.get('/pipelines/:id/executions', async (req, res, next) => {
  try {
    const pipeline = await database.getPipelineById(req.params.id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const executions = await database.getAllExecutions(req.params.id, limit);
    res.status(200).json(executions);
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.get('/executions', async (req, res, next) => {
  try {
    // Ensure database is connected
    await database.connect();
    const limit = parseInt(req.query.limit) || 50;
    const executions = await database.getAllExecutions(null, limit);
    res.status(200).json(executions);
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.get('/executions/:id', async (req, res, next) => {
  try {
    const execution = await database.getExecutionById(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.status(200).json(execution);
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.get('/executions/:id/logs', async (req, res, next) => {
  try {
    const execution = await database.getExecutionById(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.status(200).json({ 
      id: execution.id,
      logs: execution.logs,
      status: execution.status,
      pipeline_name: execution.pipeline_name
    });
  } catch (error) {
    console.error('Error fetching execution logs:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.post('/executions', validateExecutionInput, async (req, res, next) => {
  try {
    const { 
      pipeline_id, 
      status, 
      build_number, 
      build_time, 
      commit_hash, 
      commit_message, 
      branch, 
      logs 
    } = req.body;
    
    // Verify pipeline exists
    const pipeline = await database.getPipelineById(pipeline_id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const startedAt = new Date().toISOString();
    const completedAt = status === 'running' ? null : new Date().toISOString();
    
    const execution = await database.createExecution(
      pipeline_id, 
      status, 
      build_number, 
      build_time, 
      commit_hash, 
      commit_message, 
      branch, 
      logs, 
      startedAt, 
      completedAt
    );
    
    // Send email notification for pipeline execution
    try {
      const notificationService = require('../services/notificationService');
      const pipeline = await database.getPipelineById(pipeline_id);
      await notificationService.sendPipelineNotification(execution, pipeline);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the execution creation if email fails
    }
    
    // Broadcast to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'execution_created',
            data: execution
          }));
        }
      });
    }
    
    res.status(201).json(execution);
  } catch (error) {
    console.error('Error creating execution:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Dashboard Metrics APIs
router.get('/metrics/dashboard', async (req, res, next) => {
  try {
    // Ensure database is connected
    await database.connect();
    const metrics = await database.getDashboardMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.get('/metrics/build-trends', async (req, res, next) => {
  try {
    // Ensure database is connected
    await database.connect();
    const days = parseInt(req.query.days) || 7;
    const trends = await database.getBuildTrends(days);
    res.status(200).json(trends);
  } catch (error) {
    console.error('Error fetching build trends:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Alert Management APIs
router.get('/alerts/config', async (req, res, next) => {
  try {
    const pipelineId = req.query.pipeline_id;
    const configs = await database.getAlertConfigs(pipelineId);
    res.status(200).json(configs);
  } catch (error) {
    console.error('Error fetching alert configs:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.post('/alerts/config', validateAlertInput, async (req, res, next) => {
  try {
    const { pipeline_id, alert_type, webhook_url, email_address } = req.body;
    
    // Verify pipeline exists if pipeline_id is provided
    if (pipeline_id) {
      const pipeline = await database.getPipelineById(pipeline_id);
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
    }
    
    const alertConfig = await database.createAlertConfig(
      pipeline_id, 
      alert_type, 
      webhook_url, 
      email_address
    );
    
    res.status(201).json(alertConfig);
  } catch (error) {
    console.error('Error creating alert config:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Delete Alert Configuration
router.delete('/alerts/config/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await database.deleteAlertConfig(id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting alert config:', error);
    if (error.message === 'Alert configuration not found') {
      res.status(404).json({ error: 'Alert configuration not found' });
    } else {
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }
});

// Simple email test endpoint (no authentication required for basic testing)
router.post('/alerts/test-email', async (req, res) => {
  try {
    const { email_address, message } = req.body;
    
    if (!email_address) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('📧 Processing simple email test:', { email_address });
    const emailService = require('../services/emailService');
    
    const testMessage = message || 'Test email from CI/CD Dashboard - Email service is working correctly!';
    
    await emailService.sendTestEmail(email_address, testMessage);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully!' 
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      error: 'Failed to send test email', 
      message: error.message 
    });
  }
});

router.post('/alerts/test', authenticate, async (req, res, next) => {
  try {
    const { alert_type, webhook_url, email_address, message } = req.body;
    
    if (!alert_type) {
      return res.status(400).json({ error: 'Alert type is required' });
    }

    if (alert_type === 'email' && !email_address) {
      return res.status(400).json({ error: 'Email address is required for email alerts' });
    }

    console.log('📧 Processing email alert test:', { email_address });
    const emailService = require('../services/emailService');
    const result = await emailService.sendPipelineNotification({
      to: email_address,
      pipelineName: "Test Pipeline",
      status: "success",
      executionTime: 65,
      triggeredBy: "Manual Test",
      runUrl: null,
      message: message || 'Test notification from CI/CD Dashboard'
    });

    if (!result) {
      console.error('❌ Email service failed to send test email');
      return res.status(500).json({ 
        error: 'Failed to send email', 
        message: 'Check server logs for detailed SMTP error information' 
      });
    }

    console.log('✅ Email test completed successfully');
    
    res.status(200).json({ 
      message: 'Test email sent successfully',
      alert_type: 'email',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending test alert:', error);
    res.status(500).json({ 
      error: 'Failed to send alert', 
      message: error.message,
      details: error.code || error.name
    });
  }
});

const { handleGitHubWebhook } = require('../services/webhookHandler');

// Webhook Integration APIs
router.post('/webhooks/github', async (req, res, next) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const calculatedSignature = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
      
      if (signature !== calculatedSignature) {
        console.warn('⚠️ Invalid webhook signature');
        return res.status(401).send('Invalid signature');
      }
    }

    const event = req.headers['x-github-event'];
    const { repository } = req.body;

    if (!repository) {
      return res.status(400).json({ error: 'Invalid GitHub webhook payload' });
    }

    console.log('📥 GitHub Webhook received:', {
      event,
      repository: repository.full_name,
    });

    try {
      const result = await handleGitHubWebhook(req, database, req.app.get('wss'));
      res.status(200).json(result);
    } catch (error) {
      console.error('Error processing GitHub webhook:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
    await database.connect();
    const pipelines = await database.getAllPipelines();
    const matchingPipeline = pipelines.find(p => 
      p.repository_url.includes(repository.name) && p.type === 'github'
    );

    if (!matchingPipeline) {
      console.warn('⚠️ No pipeline found for repository:', repository.full_name);
      return res.status(200).send('No pipeline configured for this repository');
    }

    // Handle different event types
    switch (event) {
      case 'workflow_run': {
        const { action, workflow_run: run } = req.body;
        
        // Map GitHub status to our status format
        const status = GitHubService.normalizeStatus(run.status, run.conclusion);

        // Calculate build time if applicable
        let buildTime = null;
        if (run.run_started_at && run.updated_at && status !== 'running') {
          const startTime = new Date(run.run_started_at);
          const endTime = new Date(run.updated_at);
          buildTime = Math.floor((endTime - startTime) / 1000); // seconds
        }

        try {
          // Check if execution already exists
          const existingExecution = await database.getExecutionByExternalId(run.id.toString());
          
          if (existingExecution) {
            // Update existing execution
            await database.updateExecutionStatus(
              existingExecution.id,
              status,
              run.status === 'completed' ? run.updated_at : null,
              buildTime
            );
            
            // Send email notification for status update
            try {
              const notificationService = require('../services/notificationService');
              const updatedExecution = await database.getExecutionById(existingExecution.id);
              await notificationService.sendPipelineNotification(updatedExecution, matchingPipeline);
            } catch (emailError) {
              console.error('Failed to send email notification:', emailError);
            }
            
            console.log('✅ Updated execution status:', {
              pipelineId: matchingPipeline.id,
              executionId: existingExecution.id,
              status,
              buildTime
            });
          } else {
            // Create new execution
            const execution = await database.createExecution(
              matchingPipeline.id,
              status,
              run.run_attempt,
              buildTime,
              run.head_sha,
              run.head_commit?.message || run.display_title,
              run.head_branch,
              `GitHub Actions Run: ${run.html_url}`,
              run.run_started_at ? new Date(run.run_started_at).toISOString() : null,
              (status !== 'running' && run.updated_at) ? new Date(run.updated_at).toISOString() : null,
              run.id.toString() // external_id
            );
            
            // Send email notification for new execution
            try {
              const notificationService = require('../services/notificationService');
              await notificationService.sendPipelineNotification(execution, matchingPipeline);
            } catch (emailError) {
              console.error('Failed to send email notification:', emailError);
            }
            
            console.log('✅ Created new execution:', {
              pipelineId: matchingPipeline.id,
              executionId: execution.id,
              status,
              buildTime
            });
          }

          // Broadcast to WebSocket clients
          if (req.app.get('wss')) {
            req.app.get('wss').clients.forEach(client => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'execution_updated',
                  data: { pipelineId: matchingPipeline.id, status, action }
                }));
              }
            });
          }
        } catch (error) {
          console.error('Error processing workflow run:', error);
        }
        break;
      }

      case 'push': {
        const { head_commit, ref } = req.body;
        
        if (!head_commit) {
          return res.status(400).json({ error: 'Invalid push event payload' });
        }

        // Create new execution for push event
        const execution = await database.createExecution(
          matchingPipeline.id,
          'running',
          Date.now(),
          null,
          head_commit.id.substring(0, 8),
          head_commit.message,
          ref.replace('refs/heads/', ''),
          'Push event received\nWaiting for workflow to start...',
          new Date().toISOString(),
          null
        );
        
        // Broadcast to WebSocket clients
        if (req.app.get('wss')) {
          req.app.get('wss').clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'webhook_triggered',
                data: { pipeline: matchingPipeline, execution }
              }));
            }
          });
        }
        break;
      }
    }
    
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GitHub Actions Integration APIs
router.post('/github/sync-workflow-runs/:pipelineId', async (req, res, next) => {
  try {
    const { pipelineId } = req.params;
    const { accessToken, owner, repo, workflowId, limit = 20 } = req.body;
    
    if (!accessToken || !owner || !repo) {
      return res.status(400).json({ error: 'Missing required parameters: accessToken, owner, repo' });
    }
    
    // Get pipeline details
    const pipeline = await database.getPipelineById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Initialize GitHub service
    const githubService = new GitHubService(accessToken);
    
    // Sync workflow runs
    const result = await githubService.syncWorkflowRunsToDatabase(
      database, 
      pipelineId, 
      owner, 
      repo, 
      workflowId, 
      limit
    );
    
    // Broadcast to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'executions_synced',
            data: { pipelineId, syncedCount: result.syncedCount }
          }));
        }
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error syncing GitHub workflow runs:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Sync pipeline executions using session-based authentication
router.post('/pipelines/:id/sync', async (req, res, next) => {
  try {
    const { id: pipelineId } = req.params;
    const { limit = 20 } = req.body;
    
    // Check for GitHub authentication in session
    if (!req.session.githubToken || !req.session.user) {
      return res.status(401).json({ 
        error: 'GitHub authentication required',
        message: 'Please connect your GitHub account first to sync pipeline executions'
      });
    }
    
    // Get pipeline details
    const pipeline = await database.getPipelineById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Only allow syncing GitHub pipelines
    if (pipeline.type !== 'github') {
      return res.status(400).json({ 
        error: 'Invalid pipeline type', 
        message: 'Only GitHub pipelines can be synced with GitHub workflows' 
      });
    }
    
    // Extract owner and repo from pipeline
    let owner = pipeline.github_owner;
    let repo = pipeline.github_repo;
    let workflowId = pipeline.github_workflow_id;
    
    // Fallback: extract from repository_url if GitHub fields are null
    if (!owner || !repo) {
      if (pipeline.repository_url) {
        try {
          const url = new URL(pipeline.repository_url);
          const pathParts = url.pathname.split('/').filter(part => part);
          if (pathParts.length >= 2) {
            owner = pathParts[0];
            repo = pathParts[1];
          }
        } catch (e) {
          console.error('Error parsing repository URL:', e);
        }
      }
    }
    
    if (!owner || !repo) {
      return res.status(400).json({ 
        error: 'Pipeline missing required GitHub information. Please recreate the pipeline using the GitHub OAuth integration.',
        details: { owner, repo, workflowId, repository_url: pipeline.repository_url }
      });
    }
    
    // If no specific workflow ID, we'll fetch all workflows for this repo
    if (!workflowId) {
      console.log(`No workflow ID specified for pipeline ${pipelineId}, will sync all workflow runs`);
    }
    
    // Initialize GitHub service with user's token from session
    const githubService = new GitHubService(req.session.githubToken);
    
    // Set the GitHub token for polling service if not already set
    const pipelinePollingService = require('../services/pipelinePollingService');
    pipelinePollingService.setGitHubToken(pipelineId, req.session.githubToken);
    
    // Sync workflow runs
    const result = await githubService.syncWorkflowRunsToDatabase(
      database, 
      pipelineId, 
      owner, 
      repo, 
      workflowId, 
      limit
    );
    
    // Broadcast to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'executions_synced',
            data: { pipelineId, syncedCount: result.syncedCount }
          }));
        }
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error syncing pipeline executions:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Auto-sync pipeline executions based on pipeline type
router.post('/pipelines/:pipelineId/sync', authenticateGitHub, async (req, res, next) => {
  try {
    const { pipelineId } = req.params;
    
    // For GitHub pipelines, use the GitHub OAuth session token
    let accessToken = null;
    if (req.session.githubToken) {
      accessToken = req.session.githubToken;
    } else {
      // Fallback to request body for backward compatibility
      accessToken = req.body.accessToken;
    }
    
    // Get pipeline details
    const pipeline = await database.getPipelineById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    let result;
    
    if (pipeline.type === 'github') {
      if (!accessToken) {
        return res.status(400).json({ error: 'GitHub access token required. Please authenticate with GitHub.' });
      }
      
      // Set the GitHub token in polling service for future automated polls
      const pipelinePollingService = require('../services/pipelinePollingService');
      pipelinePollingService.setGitHubToken(parseInt(pipelineId), accessToken);
      
      // Extract owner/repo from repository URL
      const match = pipeline.repository_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid GitHub repository URL format' });
      }
      
      const [, owner, repo] = match;
      const githubService = new GitHubService(accessToken);
      
      result = await githubService.syncWorkflowRunsToDatabase(
        database, 
        pipelineId, 
        owner, 
        repo.replace('.git', ''), 
        pipeline.github_workflow_id, 
        50 // Sync more executions initially
      );
    } else {
      return res.status(400).json({ error: `Unsupported pipeline type: ${pipeline.type}` });
    }
    
    // Broadcast to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'executions_synced',
            data: { pipelineId, syncedCount: result.syncedCount }
          }));
        }
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error auto-syncing pipeline executions:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Test endpoint to manually set GitHub token for pipeline (development only)
router.post('/pipelines/:id/set-github-token', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  
  try {
    const pipelineId = req.params.id;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required' });
    }
    
    const pipelinePollingService = require('../services/pipelinePollingService');
    pipelinePollingService.setGitHubToken(parseInt(pipelineId), token);
    
    res.json({ 
      success: true, 
      message: `GitHub token set for pipeline ${pipelineId}`,
      note: 'This is a development-only endpoint. Use GitHub OAuth for production.'
    });
  } catch (error) {
    console.error('Error setting GitHub token:', error);
    res.status(500).json({ error: 'Failed to set GitHub token' });
  }
});

// === SELECTIVE PIPELINE MANAGEMENT ENDPOINTS ===

// Discover repositories for selective pipeline creation
router.get('/github/repositories', authenticateGitHub, async (req, res) => {
  try {
    // Get token from GitHub OAuth session
    if (!req.session.githubToken) {
      return res.status(401).json({ error: 'User not authenticated with GitHub' });
    }
    
    const SelectivePipelineService = require('../services/selectivePipelineService');
    const service = new SelectivePipelineService(database);
    const repositories = await service.discoverRepositories(req.session.githubToken);
    
    res.json({
      success: true,
      repositories
    });
  } catch (error) {
    console.error('Error discovering repositories:', error);
    res.status(500).json({ error: 'Failed to discover repositories' });
  }
});

// Discover workflows for a specific repository
router.get('/github/repositories/:owner/:repo/workflows', authenticateGitHub, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    // Get token from GitHub OAuth session
    if (!req.session.githubToken) {
      return res.status(401).json({ error: 'User not authenticated with GitHub' });
    }
    
    const SelectivePipelineService = require('../services/selectivePipelineService');
    const service = new SelectivePipelineService(database);
    const workflows = await service.discoverWorkflows(req.session.githubToken, owner, repo);
    
    res.json({
      success: true,
      workflows
    });
  } catch (error) {
    console.error('Error discovering workflows:', error);
    res.status(500).json({ error: 'Failed to discover workflows' });
  }
});

// Add selected pipelines
router.post('/pipelines/selective-add', authenticateGitHub, async (req, res) => {
  try {
    const { selections } = req.body;
    
    // Get token from GitHub OAuth session
    if (!req.session.githubToken) {
      return res.status(401).json({ error: 'User not authenticated with GitHub' });
    }
    
    if (!selections || !Array.isArray(selections)) {
      return res.status(400).json({ error: 'Selections array is required' });
    }
    
    const SelectivePipelineService = require('../services/selectivePipelineService');
    const service = new SelectivePipelineService(database);
    const createdPipelines = await service.addSelectedPipelines(req.session.githubToken, selections);
    
    // Set tokens for the new pipelines in the polling service
    const pipelinePollingService = require('../services/pipelinePollingService');
    createdPipelines.forEach(pipeline => {
      pipelinePollingService.setGitHubToken(pipeline.id, req.session.githubToken);
    });
    
    res.json({
      success: true,
      message: `Created ${createdPipelines.length} pipelines`,
      pipelines: createdPipelines
    });
  } catch (error) {
    console.error('Error adding selected pipelines:', error);
    res.status(500).json({ error: 'Failed to add selected pipelines' });
  }
});

// Get pipeline recommendations
router.get('/github/recommendations', authenticateGitHub, async (req, res) => {
  try {
    // Get token from GitHub OAuth session
    if (!req.session.githubToken) {
      return res.status(401).json({ error: 'User not authenticated with GitHub' });
    }
    
    const SelectivePipelineService = require('../services/selectivePipelineService');
    const service = new SelectivePipelineService(database);
    const recommendations = await service.getRecommendations(req.session.githubToken);
    
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Test WebSocket endpoint
router.post('/test-websocket', async (req, res) => {
  try {
    const { type = 'test', message = 'Test notification' } = req.body;
    
    // Broadcast test message to WebSocket clients
    if (req.app.get('wss')) {
      req.app.get('wss').clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'execution_created',
            data: {
              pipeline_id: 1,
              pipeline_name: 'Test Pipeline',
              execution_id: 999,
              status: 'running',
              action: 'test',
              started_at: new Date().toISOString()
            }
          }));
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Test WebSocket message sent',
      clients: req.app.get('wss') ? req.app.get('wss').clients.size : 0
    });
  } catch (error) {
    console.error('Error sending test WebSocket message:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

module.exports = router;
