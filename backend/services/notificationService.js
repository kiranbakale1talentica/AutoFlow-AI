const emailService = require('./emailService');
const Database = require('../models/database');

class NotificationService {
  constructor() {
    this.database = null;
  }

  setDatabase(databaseInstance) {
    this.database = databaseInstance;
  }

  async sendPipelineNotification(execution, pipeline, eventType = null) {
    try {
      const db = this.database || new Database();
      if (!this.database) {
        await db.connect();
      }

      // Determine the event type based on execution status if not provided
      const event = eventType || this.getEventTypeFromStatus(execution.status, execution.previous_status);

      // Get email settings for this pipeline
      const emailSettings = await db.getEmailSettingsForPipeline(pipeline.id);
      
      if (!emailSettings || emailSettings.length === 0) {
        console.log('No email settings configured for pipeline:', pipeline.name);
        return;
      }

      // Get failed stage information if execution failed
      let failedStage = null;
      if (execution.status === 'failure' && execution.logs) {
        // Try to extract failed stage from logs
        const logLines = execution.logs.split('\n');
        const failedLineIndex = logLines.findIndex(line => 
          line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
        );
        if (failedLineIndex >= 0) {
          failedStage = logLines[failedLineIndex];
        }
      }

      // For each email configuration
      for (const config of emailSettings) {
        // Check if we should notify based on the event type
        if (!this.shouldNotify(config, event)) {
          console.log(`Skipping notification for ${config.email_address}, event: ${event}`);
          continue;
        }

        // Create the GitHub workflow run URL if it's a GitHub pipeline
        const runUrl = pipeline.type === 'github' && execution.github_run_id ? 
          `${pipeline.repository_url.replace('github.com', 'github.com/').replace('.git', '')}/actions/runs/${execution.github_run_id}` :
          null;

        // Send the email notification
        await emailService.sendPipelineNotification({
          to: config.email_address,
          pipelineName: pipeline.name,
          status: execution.status,
          eventType: event,
          failedStage: failedStage,
          executionTime: execution.build_time,
          triggeredBy: execution.commit_message || 'Manual trigger',
          runUrl,
          startedAt: execution.started_at,
          completedAt: execution.completed_at
        });
      }
    } catch (error) {
      console.error('Error sending pipeline notification:', error);
    }
  }

  getEventTypeFromStatus(currentStatus, previousStatus) {
    if (!previousStatus && currentStatus === 'running') {
      return 'started';
    }
    if (previousStatus === 'running' && currentStatus === 'success') {
      return 'success';
    }
    if (previousStatus === 'running' && currentStatus === 'failure') {
      return 'failure';
    }
    if (previousStatus === 'running' && currentStatus === 'stopped') {
      return 'stopped';
    }
    return currentStatus; // fallback to status
  }

  shouldNotify(config, eventType) {
    switch (eventType) {
      case 'started':
        return config.notify_on_started;
      case 'success':
        return config.notify_on_success;
      case 'failure':
        return config.notify_on_failure;
      case 'stopped':
        return config.notify_on_stopped;
      default:
        // For backward compatibility, notify on success/failure if event type not specified
        return config.notify_on_success || config.notify_on_failure;
    }
  }

  // Helper method to send notifications for pipeline started event
  async sendPipelineStartedNotification(execution, pipeline) {
    return this.sendPipelineNotification(execution, pipeline, 'started');
  }

  // Helper method to send notifications for pipeline completed events
  async sendPipelineCompletedNotification(execution, pipeline) {
    const eventType = execution.status === 'success' ? 'success' : 
                     execution.status === 'failure' ? 'failure' : 'stopped';
    return this.sendPipelineNotification(execution, pipeline, eventType);
  }
}

module.exports = new NotificationService();
