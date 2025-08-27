const Database = require('../models/database');
const GitHubService = require('./githubService');

class SelectivePipelineService {
  constructor(databaseInstance = null) {
    this.database = databaseInstance || new Database();
  }

  // Discover repositories for a user
  async discoverRepositories(githubToken) {
    try {
      console.log('🔍 Discovering repositories...');
      const githubService = new GitHubService(githubToken);
      const repositories = await githubService.getUserRepositories();
      
      return repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        description: repo.description,
        isPrivate: repo.private,
        language: repo.language,
        updatedAt: repo.updated_at
      }));
    } catch (error) {
      console.error('Error discovering repositories:', error);
      throw error;
    }
  }

  // Discover workflows for a specific repository
  async discoverWorkflows(githubToken, owner, repo) {
    try {
      console.log(`🔍 Discovering workflows for ${owner}/${repo}...`);
      const githubService = new GitHubService(githubToken);
      const workflows = await githubService.getWorkflows(owner, repo);
      
      return workflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        path: workflow.path,
        state: workflow.state,
        htmlUrl: workflow.html_url,
        badgeUrl: workflow.badge_url
      }));
    } catch (error) {
      console.error(`Error discovering workflows for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  // Add specific pipelines based on user selection
  async addSelectedPipelines(githubToken, selections) {
    try {
      await this.database.connect();
      const createdPipelines = [];
      const GitHubService = require('./githubService');

      for (const selection of selections) {
        const { repositoryUrl, repositoryName, workflows } = selection;
        
        // Extract owner and repo from URL
        const repoMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!repoMatch) {
          console.error(`Invalid repository URL: ${repositoryUrl}`);
          continue;
        }
        
        const [, owner, repo] = repoMatch;

        for (const workflow of workflows) {
          try {
            // Create pipeline
            const pipeline = await this.database.createPipeline(
              `${repositoryName} - ${workflow.name}`,
              'github',
              repositoryUrl,
              null // No webhook URL for GitHub Actions
            );

            // Update with GitHub-specific information
            await this.database.updatePipelineGitHubInfo(
              pipeline.id,
              workflow.id,
              owner,
              repo,
              workflow.name
            );

            // Immediately sync initial executions (increased to get more history)
            try {
              const githubService = new GitHubService(githubToken);
              const syncResult = await githubService.syncWorkflowRunsToDatabase(
                this.database,
                pipeline.id,
                owner,
                repo,
                workflow.id,
                100 // Sync last 100 executions for better historical data
              );
              console.log(`✅ Synced ${syncResult.syncedCount} executions for ${pipeline.name}`);
            } catch (syncError) {
              console.error(`⚠️ Failed to sync initial executions for ${pipeline.name}:`, syncError);
            }

            createdPipelines.push({
              id: pipeline.id,
              name: pipeline.name,
              repository: repositoryName,
              workflow: workflow.name
            });

            console.log(`✅ Created pipeline: ${pipeline.name}`);
          } catch (error) {
            console.error(`Error creating pipeline for ${workflow.name}:`, error);
          }
        }
      }

      return createdPipelines;
    } catch (error) {
      console.error('Error adding selected pipelines:', error);
      throw error;
    }
  }

  // Get pipeline recommendations based on repository activity
  async getRecommendations(githubToken, maxRepos = 10) {
    try {
      const githubService = new GitHubService(githubToken);
      const repositories = await githubService.getUserRepositories();
      
      // Sort by recent activity and filter those with workflows
      const recommendations = [];
      
      for (const repo of repositories.slice(0, maxRepos)) {
        try {
          const workflows = await githubService.getWorkflows(repo.owner.login, repo.name);
          if (workflows.length > 0) {
            recommendations.push({
              repository: {
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                description: repo.description,
                language: repo.language,
                updatedAt: repo.updated_at
              },
              workflows: workflows.map(w => ({
                id: w.id,
                name: w.name,
                state: w.state
              })),
              workflowCount: workflows.length
            });
          }
        } catch (error) {
          // Skip repos we can't access workflows for
          continue;
        }
      }

      // Sort by most recent activity
      recommendations.sort((a, b) => 
        new Date(b.repository.updatedAt) - new Date(a.repository.updatedAt)
      );

      return recommendations;
    } catch (error) {
      console.error('Error getting pipeline recommendations:', error);
      throw error;
    }
  }
}

module.exports = SelectivePipelineService;
