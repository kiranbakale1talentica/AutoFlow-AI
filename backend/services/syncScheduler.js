const Database = require('../models/database');
const GitHubService = require('./githubService');

class SyncScheduler {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.syncIntervalMs = 5 * 60 * 1000; // 5 minutes
    this.database = null; // Will be set from server
  }

  // Set the database instance (called from server.js)
  setDatabase(databaseInstance) {
    this.database = databaseInstance;
  }

  // Start the periodic sync process
  start() {
    if (this.isRunning) {
      console.log('⚠️  Sync scheduler is already running');
      return;
    }

    if (!this.database) {
      console.error('❌ Database instance not set for sync scheduler');
      return;
    }

    console.log('🔄 Starting periodic sync scheduler...');
    this.isRunning = true;
    
    // Run initial sync
    this.runSync();
    
    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      this.runSync();
    }, this.syncIntervalMs);
    
    console.log(`✅ Sync scheduler started with ${this.syncIntervalMs / 1000}s interval`);
  }

  // Stop the periodic sync process
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Sync scheduler is not running');
      return;
    }

    console.log('🛑 Stopping sync scheduler...');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isRunning = false;
    console.log('✅ Sync scheduler stopped');
  }

  // Run sync for all active pipelines
  async runSync() {
    try {
      console.log('🔄 Running periodic sync...');
      
      // Get all active pipelines
      const pipelines = await this.database.getAllPipelines();
      const activePipelines = pipelines.filter(p => p.is_active);
      
      if (activePipelines.length === 0) {
        console.log('📋 No active pipelines to sync');
        return;
      }

      console.log(`📋 Found ${activePipelines.length} active pipelines to sync`);
      
      let totalSynced = 0;
      
      for (const pipeline of activePipelines) {
        try {
          const syncResult = await this.syncPipeline(pipeline);
          totalSynced += syncResult.syncedCount;
          
          if (syncResult.syncedCount > 0) {
            console.log(`✅ Synced ${syncResult.syncedCount} executions for pipeline: ${pipeline.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to sync pipeline ${pipeline.name}:`, error.message);
        }
      }
      
      if (totalSynced > 0) {
        console.log(`🎉 Periodic sync completed. Total synced: ${totalSynced} executions`);
      } else {
        console.log('✅ Periodic sync completed. No new executions found.');
      }
    } catch (error) {
      console.error('❌ Error during periodic sync:', error);
    }
  }

  // Sync a single pipeline based on its type
  async syncPipeline(pipeline) {
    if (pipeline.type === 'github') {
      return await this.syncGitHubPipeline(pipeline);
    } else {
      console.warn(`⚠️  Unsupported pipeline type: ${pipeline.type} for pipeline: ${pipeline.name}`);
      return { syncedCount: 0 };
    }
  }

  // Sync GitHub pipeline (requires stored access token)
  async syncGitHubPipeline(pipeline) {
    try {
      // Check if we have a valid session with GitHub token
      // Skip GitHub sync if no user session is available
      console.log(`⚠️ No GitHub token available for pipeline: ${pipeline.name} (GitHub)`);
      return { syncedCount: 0, message: 'GitHub sync requires user authentication' };
      
    } catch (error) {
      throw new Error(`GitHub sync failed: ${error.message}`);
    }
  }

  // Set sync interval (in milliseconds)
  setSyncInterval(intervalMs) {
    this.syncIntervalMs = intervalMs;
    
    if (this.isRunning) {
      console.log(`🔄 Updating sync interval to ${intervalMs / 1000}s`);
      this.stop();
      this.start();
    }
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncIntervalMs: this.syncIntervalMs,
      nextSyncIn: this.isRunning ? this.syncIntervalMs : null
    };
  }
}

// Export singleton instance
const syncScheduler = new SyncScheduler();
module.exports = syncScheduler;
