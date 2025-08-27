const crypto = require('crypto');
const notificationService = require('../services/notificationService');
const GitHubService = require('../services/githubService');

// Modified webhook handler to send notifications
const handleGitHubWebhook = async (req, database, wss) => {
  const { repository, workflow_run: run } = req.body;
  const matchingPipeline = await database.getAllPipelines()
    .then(pipelines => pipelines.find(p => 
      p.repository_url.includes(repository.name) && p.type === 'github'
    ));

  if (!matchingPipeline) {
    console.warn('⚠️ No pipeline found for repository:', repository.full_name);
    return { success: false, message: 'No pipeline configured for this repository' };
  }

  if (run) {
    const status = GitHubService.normalizeStatus(run.status, run.conclusion);
    let buildTime = null;
    
    if (run.run_started_at && run.updated_at && status !== 'running') {
      const startTime = new Date(run.run_started_at);
      const endTime = new Date(run.updated_at);
      buildTime = Math.floor((endTime - startTime) / 1000);
    }

    try {
      const existingExecution = await database.getExecutionByExternalId(run.id.toString());
      let execution;
      
      if (existingExecution) {
        // Update existing execution
        const previousStatus = existingExecution.status;
        await database.updateExecutionStatus(
          existingExecution.id,
          status,
          run.status === 'completed' ? run.updated_at : null,
          buildTime
        );
        execution = await database.getExecutionById(existingExecution.id);
        execution.previous_status = previousStatus;
      } else {
        // Create new execution
        execution = await database.createExecution(
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
          run.id.toString()
        );
        execution.previous_status = null;
      }

      // Send email notifications based on pipeline lifecycle events
      if (status === 'running' && !existingExecution) {
        // Pipeline started
        await notificationService.sendPipelineStartedNotification(execution, matchingPipeline);
      } else if (status !== 'running' && existingExecution?.status === 'running') {
        // Pipeline completed (success, failure, or stopped)
        await notificationService.sendPipelineCompletedNotification(execution, matchingPipeline);
      }

      // Broadcast to WebSocket clients
      if (wss) {
        const eventType = status === 'running' && !existingExecution ? 'execution_created' : 'execution_updated';
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: eventType,
              data: { 
                pipeline_id: matchingPipeline.id,
                pipeline_name: matchingPipeline.name,
                execution_id: execution.id,
                status: status,
                action: req.body.action,
                started_at: execution.started_at,
                completed_at: execution.completed_at
              }
            }));
          }
        });
      }

      return { success: true, execution };
    } catch (error) {
      console.error('Error processing workflow run:', error);
      throw error;
    }
  }
  
  return { success: true, message: 'Webhook processed' };
};

module.exports = {
  handleGitHubWebhook
};
