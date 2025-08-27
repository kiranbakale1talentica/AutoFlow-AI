const axios = require('axios');
const notificationService = require('./notificationService');

class GitHubService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.apiBase = 'https://api.github.com';
    this.headers = {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CI-CD-Pipeline-Dashboard'
    };
  }

  // Get user's repositories
  async getUserRepositories() {
    try {
      const response = await axios.get(`${this.apiBase}/user/repos`, {
        headers: this.headers,
        params: {
          sort: 'updated',
          per_page: 100,
          type: 'all'
        }
      });
      
      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        defaultBranch: repo.default_branch,
        language: repo.language,
        hasWorkflows: false, // We'll check this separately
        updatedAt: repo.updated_at,
        owner: {
          login: repo.owner.login,
          avatarUrl: repo.owner.avatar_url
        }
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error.response?.data || error.message);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  // Check if repository has GitHub Actions workflows
  async getRepositoryWorkflows(owner, repo) {
    try {
      const response = await axios.get(`${this.apiBase}/repos/${owner}/${repo}/actions/workflows`, {
        headers: this.headers
      });
      
      return response.data.workflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        path: workflow.path,
        state: workflow.state,
        badge_url: workflow.badge_url,
        html_url: workflow.html_url,
        created_at: workflow.created_at,
        updated_at: workflow.updated_at
      }));
    } catch (error) {
      if (error.response?.status === 404) {
        return []; // No workflows found
      }
      console.error('Error fetching workflows:', error.response?.data || error.message);
      throw new Error('Failed to fetch workflows from GitHub');
    }
  }

  // Alias for getRepositoryWorkflows for consistency
  async getWorkflows(owner, repo) {
    return await this.getRepositoryWorkflows(owner, repo);
  }

  // Get workflow runs for a specific workflow
  async getWorkflowRuns(owner, repo, workflowId = null, limit = 20) {
    try {
      const endpoint = workflowId 
        ? `${this.apiBase}/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`
        : `${this.apiBase}/repos/${owner}/${repo}/actions/runs`;
        
      const response = await axios.get(endpoint, {
        headers: this.headers,
        params: {
          per_page: limit
        }
      });
      
      return response.data.workflow_runs.map(run => ({
        id: run.id,
        name: run.name,
        displayTitle: run.display_title,
        status: run.status, // queued, in_progress, completed
        conclusion: run.conclusion, // success, failure, neutral, cancelled, skipped, timed_out, action_required
        workflowId: run.workflow_id,
        checkSuiteId: run.check_suite_id,
        checkSuiteNodeId: run.check_suite_node_id,
        url: run.url,
        htmlUrl: run.html_url,
        pullRequests: run.pull_requests,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        runAttempt: run.run_attempt,
        runStartedAt: run.run_started_at,
        triggering_actor: {
          login: run.triggering_actor.login,
          avatar_url: run.triggering_actor.avatar_url
        },
        workflow_url: run.workflow_url,
        head_commit: {
          id: run.head_commit.id,
          tree_id: run.head_commit.tree_id,
          message: run.head_commit.message,
          timestamp: run.head_commit.timestamp,
          author: run.head_commit.author,
          committer: run.head_commit.committer
        },
        head_branch: run.head_branch,
        head_sha: run.head_sha
      }));
    } catch (error) {
      console.error('Error fetching workflow runs:', error.response?.data || error.message);
      throw new Error('Failed to fetch workflow runs from GitHub');
    }
  }

  // Create a webhook for the repository
  async createWebhook(owner, repo, callbackUrl) {
    try {
      const response = await axios.post(`${this.apiBase}/repos/${owner}/${repo}/hooks`, {
        name: 'web',
        active: true,
        events: [
          'workflow_run',
          'workflow_job',
          'check_run',
          'check_suite',
          'push',
          'pull_request'
        ],
        config: {
          url: callbackUrl,
          content_type: 'json',
          insecure_ssl: '0'
        }
      }, {
        headers: this.headers
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        active: response.data.active,
        events: response.data.events,
        config: response.data.config,
        url: response.data.url,
        test_url: response.data.test_url,
        ping_url: response.data.ping_url,
        last_response: response.data.last_response,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      };
    } catch (error) {
      console.error('Error creating webhook:', error.response?.data || error.message);
      throw new Error('Failed to create webhook on GitHub repository');
    }
  }

  // Test webhook by sending a ping
  async testWebhook(owner, repo, hookId) {
    try {
      const response = await axios.post(`${this.apiBase}/repos/${owner}/${repo}/hooks/${hookId}/pings`, {}, {
        headers: this.headers
      });
      return { success: true, status: response.status };
    } catch (error) {
      console.error('Error testing webhook:', error.response?.data || error.message);
      throw new Error('Failed to test webhook');
    }
  }

  // Get repository details
  async getRepository(owner, repo) {
    try {
      const response = await axios.get(`${this.apiBase}/repos/${owner}/${repo}`, {
        headers: this.headers
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        private: response.data.private,
        htmlUrl: response.data.html_url,
        cloneUrl: response.data.clone_url,
        defaultBranch: response.data.default_branch,
        language: response.data.language,
        stargazersCount: response.data.stargazers_count,
        watchersCount: response.data.watchers_count,
        forksCount: response.data.forks_count,
        openIssuesCount: response.data.open_issues_count,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        pushedAt: response.data.pushed_at,
        owner: {
          login: response.data.owner.login,
          avatarUrl: response.data.owner.avatar_url,
          type: response.data.owner.type
        }
      };
    } catch (error) {
      console.error('Error fetching repository:', error.response?.data || error.message);
      throw new Error('Failed to fetch repository details from GitHub');
    }
  }

  // Sync workflow runs to database
  async syncWorkflowRunsToDatabase(database, pipelineId, owner, repo, workflowId = null, limit = 50) {
    try {
      const runs = await this.getWorkflowRuns(owner, repo, workflowId, limit);
      const syncedRuns = [];
      
      // Get pipeline info for notifications
      const pipeline = await database.getPipelineById(pipelineId);
      
      for (const run of runs) {
        try {
          // Check if execution already exists
          const existingExecution = await database.getExecutionByExternalId(run.id.toString());
          
          if (!existingExecution) {
            // Create new execution from workflow run
            const execution = await database.createExecution(
              pipelineId,
              GitHubService.normalizeStatus(run.status, run.conclusion),
              run.id,
              run.updatedAt && run.runStartedAt ? 
                Math.round((new Date(run.updatedAt) - new Date(run.runStartedAt)) / 1000) : null,
              run.head_commit.id.substring(0, 8),
              run.head_commit.message,
              run.head_branch,
              `Workflow: ${run.name}\nStatus: ${run.status}\nConclusion: ${run.conclusion || 'N/A'}\nCommit: ${run.head_commit.id}`,
              run.runStartedAt || run.createdAt,
              run.status === 'completed' ? run.updatedAt : null,
              run.id.toString() // external_id for tracking
            );
            
            syncedRuns.push(execution);
            
            // Send notification for new execution
            if (pipeline) {
              try {
                await notificationService.sendPipelineNotification(execution, pipeline);
                console.log(`📧 Notification sent for new execution ${execution.id}`);
              } catch (notifError) {
                console.error(`Error sending notification for execution ${execution.id}:`, notifError);
              }
            }
          } else {
            // Update existing execution if status changed
            const newStatus = GitHubService.normalizeStatus(run.status, run.conclusion);
            if (existingExecution.status !== newStatus) {
              const previousStatus = existingExecution.status;
              await database.updateExecutionStatus(
                existingExecution.id,
                newStatus,
                run.status === 'completed' ? run.updatedAt : null,
                run.updatedAt && run.runStartedAt ? 
                  Math.round((new Date(run.updatedAt) - new Date(run.runStartedAt)) / 1000) : null
              );
              
              // Get updated execution for notification
              const updatedExecution = await database.getExecutionById(existingExecution.id);
              if (updatedExecution) {
                updatedExecution.previous_status = previousStatus;
                syncedRuns.push(updatedExecution);
                
                // Send notification for status change
                if (pipeline) {
                  try {
                    await notificationService.sendPipelineNotification(updatedExecution, pipeline);
                    console.log(`📧 Notification sent for updated execution ${existingExecution.id} (${previousStatus} → ${newStatus})`);
                  } catch (notifError) {
                    console.error(`Error sending notification for execution ${existingExecution.id}:`, notifError);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing run ${run.id}:`, error);
        }
      }
      
      return {
        success: true,
        syncedCount: syncedRuns.length,
        runs: syncedRuns
      };
    } catch (error) {
      console.error('Error syncing workflow runs:', error);
      throw new Error('Failed to sync workflow runs to database');
    }
  }

  // Normalize GitHub workflow status to our standard format
  static normalizeStatus(status, conclusion) {
    // If workflow is still running
    if (status === 'in_progress' || status === 'queued' || status === 'pending') {
      return 'running';
    }
    
    // If workflow is completed, check conclusion
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return 'success';
        case 'failure':
          return 'failure';
        case 'cancelled':
          return 'cancelled';
        case 'skipped':
          return 'skipped';
        case 'timed_out':
          return 'timeout';
        case 'action_required':
          return 'pending';
        default:
          return 'unknown';
      }
    }
    
    return 'pending';
  }

  // Get workflow run jobs (steps)
  async getWorkflowRunJobs(owner, repo, runId) {
    try {
      const response = await axios.get(`${this.apiBase}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
        headers: this.headers
      });
      
      return response.data.jobs.map(job => ({
        id: job.id,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        url: job.url,
        htmlUrl: job.html_url,
        runnerName: job.runner_name,
        runnerGroupName: job.runner_group_name,
        steps: job.steps?.map(step => ({
          name: step.name,
          status: step.status,
          conclusion: step.conclusion,
          number: step.number,
          startedAt: step.started_at,
          completedAt: step.completed_at
        })) || []
      }));
    } catch (error) {
      console.error('Error fetching workflow run jobs:', error.response?.data || error.message);
      throw new Error('Failed to fetch workflow run jobs from GitHub');
    }
  }

  // Get workflow run logs
  async getWorkflowRunLogs(owner, repo, runId) {
    try {
      const response = await axios.get(`${this.apiBase}/repos/${owner}/${repo}/actions/runs/${runId}/logs`, {
        headers: this.headers,
        responseType: 'stream'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow run logs:', error.response?.data || error.message);
      throw new Error('Failed to fetch workflow run logs from GitHub');
    }
  }
}

module.exports = GitHubService;
