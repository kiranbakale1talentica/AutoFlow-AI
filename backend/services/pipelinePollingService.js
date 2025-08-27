const Database = require('../models/database');
const GitHubService = require('./githubService');
const notificationService = require('./notificationService');

class PipelinePollingService {
  constructor() {
    this.database = null; // Will be set from server
    this.isRunning = false;
    this.intervalId = null;
    this.pollInterval = 30000; // 30 seconds
    this.githubTokens = new Map(); // Store GitHub tokens for active pipelines
  }

  // Set the database instance (called from server.js)
  setDatabase(databaseInstance) {
    this.database = databaseInstance;
  }

  // Set GitHub token for a pipeline
  setGitHubToken(pipelineId, token) {
    this.githubTokens.set(pipelineId, token);
    console.log(`🔑 GitHub token set for pipeline ${pipelineId}`);
  }

  // Set global GitHub token for discovering new pipelines
  setGlobalGitHubToken(token) {
    this.globalGitHubToken = token;
    console.log(`🔑 Global GitHub token set for pipeline discovery`);
  }

  // Remove GitHub token for a pipeline
  removeGitHubToken(pipelineId) {
    this.githubTokens.delete(pipelineId);
    console.log(`🔑 GitHub token removed for pipeline ${pipelineId}`);
  }

  async start() {
    if (this.isRunning) {
      console.log('🔄 Pipeline polling service is already running');
      return;
    }

    if (!this.database) {
      console.error('❌ Database instance not set for pipeline polling service');
      return;
    }

    console.log('🔄 Starting pipeline polling service...');
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      try {
        await this.pollPipelines();
      } catch (error) {
        console.error('Error in pipeline polling:', error);
      }
    }, this.pollInterval);

    console.log(`✅ Pipeline polling service started (interval: ${this.pollInterval / 1000}s)`);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping pipeline polling service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Pipeline polling service stopped');
  }

  async pollPipelines() {
    try {
      const pipelines = await this.database.getAllPipelines();
      const activePipelines = pipelines.filter(p => p.is_active && p.type === 'github');

      for (const pipeline of activePipelines) {
        try {
          await this.pollPipelineExecutions(pipeline);
        } catch (error) {
          console.error(`Error polling pipeline ${pipeline.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines for polling:', error);
    }
  }

  // Discover new pipelines from GitHub
  async discoverNewPipelines() {
    try {
      console.log('🔍 Discovering new pipelines from GitHub...');
      const githubService = new GitHubService(this.globalGitHubToken);
      
      // Get user's repositories
      const repositories = await githubService.getUserRepositories();
      let newPipelinesCount = 0;

      for (const repo of repositories) {
        try {
          // Check if pipeline already exists
          const existingPipeline = await this.database.getPipelineByRepoUrl(repo.html_url);
          if (existingPipeline) {
            continue; // Skip if already exists
          }

          // Get workflows for this repository
          const workflows = await githubService.getWorkflows(repo.owner.login, repo.name);
          
          for (const workflow of workflows) {
            try {
              // Create new pipeline for each workflow
              const pipeline = await this.database.createPipeline(
                `${repo.name} (${workflow.name})`,
                'github',
                repo.html_url,
                null // No webhook URL for GitHub Actions
              );

              // Set additional GitHub-specific fields
              await this.database.updatePipelineGitHubInfo(
                pipeline.id,
                workflow.id,
                repo.owner.login,
                repo.name,
                workflow.name
              );

              // Set token for this new pipeline
              this.setGitHubToken(pipeline.id, this.globalGitHubToken);

              newPipelinesCount++;
              console.log(`✅ Discovered new pipeline: ${pipeline.name}`);
            } catch (workflowError) {
              console.error(`Error creating pipeline for workflow ${workflow.name}:`, workflowError);
            }
          }
        } catch (repoError) {
          console.error(`Error processing repository ${repo.name}:`, repoError);
        }
      }

      if (newPipelinesCount > 0) {
        console.log(`🎉 Discovered ${newPipelinesCount} new pipelines from GitHub`);
      } else {
        console.log('📋 No new pipelines found');
      }
    } catch (error) {
      console.error('Error discovering new pipelines:', error);
    }
  }

  async pollPipelineExecutions(pipeline) {
    try {
      // Check if we have a GitHub token for this pipeline
      const token = this.githubTokens.get(pipeline.id);
      if (!token) {
        // Don't log warning messages for missing tokens to reduce noise
        // Only poll when user has connected their GitHub account
        return;
      }

      console.log(`🔍 Polling pipeline: ${pipeline.name}`);
      
      // Extract owner/repo from repository URL
      const repoMatch = pipeline.repository_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        console.error(`Invalid GitHub repository URL for pipeline ${pipeline.name}: ${pipeline.repository_url}`);
        return;
      }

      const [, owner, repo] = repoMatch;
      const cleanRepo = repo.replace('.git', '');

      // Initialize GitHub service
      const githubService = new GitHubService(token);

      // Get latest workflow runs (last 10)
      const workflowRuns = await githubService.getWorkflowRuns(owner, cleanRepo, pipeline.github_workflow_id, 10);

      let updatedCount = 0;
      let newCount = 0;

      for (const run of workflowRuns) {
        try {
          // Check if execution already exists
          const existingExecution = await this.database.getExecutionByExternalId(run.id.toString());
          
          const status = GitHubService.normalizeStatus(run.status, run.conclusion);
          let buildTime = null;
          
          if (run.runStartedAt && run.updatedAt && status !== 'running') {
            const startTime = new Date(run.runStartedAt);
            const endTime = new Date(run.updatedAt);
            buildTime = Math.floor((endTime - startTime) / 1000);
          }

          if (existingExecution) {
            // Update existing execution if status or build time changed
            if (existingExecution.status !== status || existingExecution.build_time !== buildTime) {
              await this.database.updateExecutionStatus(
                existingExecution.id,
                status,
                status !== 'running' ? new Date(run.updatedAt).toISOString() : null,
                buildTime
              );

              // Get updated execution for notification
              const updatedExecution = await this.database.getExecutionById(existingExecution.id);
              
              // Send notification for status change
              await notificationService.sendPipelineNotification(updatedExecution, pipeline);
              
              // Broadcast WebSocket update
              this.broadcastUpdate('execution_updated', { 
                pipelineId: pipeline.id, 
                executionId: existingExecution.id,
                status,
                buildTime 
              });

              updatedCount++;
              console.log(`✅ Updated execution ${existingExecution.id} status: ${status}`);
            }
          } else {
            // Create new execution with auto-generated build number
            const execution = await this.database.createExecutionWithBuildNumber(
              pipeline.id,
              status,
              buildTime,
              run.head_sha ? run.head_sha.substring(0, 8) : 'unknown',
              run.head_commit?.message || run.displayTitle,
              run.head_branch || 'main',
              `GitHub Actions Run: ${run.htmlUrl}\nWorkflow: ${run.name}\nStatus: ${run.status}\nConclusion: ${run.conclusion || 'N/A'}`,
              run.runStartedAt ? new Date(run.runStartedAt).toISOString() : new Date(run.createdAt).toISOString(),
              status !== 'running' ? new Date(run.updatedAt).toISOString() : null,
              run.id.toString()
            );

            // Send notification for new execution
            await notificationService.sendPipelineNotification(execution, pipeline);
            
            // Broadcast WebSocket update
            this.broadcastUpdate('execution_created', { 
              pipelineId: pipeline.id, 
              execution 
            });

            newCount++;
            console.log(`✅ Created new execution ${execution.id} for pipeline ${pipeline.name}`);
          }
        } catch (error) {
          console.error(`Error processing run ${run.id} for pipeline ${pipeline.name}:`, error);
        }
      }

      if (updatedCount > 0 || newCount > 0) {
        console.log(`📊 Pipeline ${pipeline.name}: ${newCount} new, ${updatedCount} updated executions`);
      }

    } catch (error) {
      console.error(`Error polling executions for ${pipeline.name}:`, error);
    }
  }

  // Broadcast updates to WebSocket clients
  broadcastUpdate(type, data) {
    // This will be set by the server when the service is initialized
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
  }

  // Manual trigger for immediate sync
  async triggerImmediateSync() {
    console.log('🔄 Manual sync triggered...');
    if (this.isPolling) {
      await this.pollPipelines();
    } else {
      console.log('⚠️ Polling service not running, starting sync...');
      await this.pollPipelines();
    }
  }

  // Set WebSocket server reference
  setWebSocketServer(wss) {
    this.wss = wss;
  }
}

module.exports = new PipelinePollingService();
