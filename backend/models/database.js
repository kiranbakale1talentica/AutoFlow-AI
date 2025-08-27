const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');
const DatabaseEmailMethods = require('./database_email_methods');

class Database {
  constructor() {
    this.db = null;
    this.emailMethods = null;
  }

  async connect() {
    if (this.db) {
      console.log('Database already connected');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const dbPath = path.resolve(config.dbPath);
      console.log(`Attempting to connect to database at: ${dbPath}`);
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.emailMethods = new DatabaseEmailMethods(this.db);
          this.initializeTables();
          resolve();
        }
      });
    });
  }

  initializeTables() {
    // Create pipelines table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL CHECK(type = 'github'),
        repository_url TEXT,
        webhook_url TEXT,
        github_repository_id TEXT,
        github_workflow_id TEXT,
        github_webhook_id TEXT,
        github_owner TEXT,
        github_repo TEXT,
        github_workflow_name TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create executions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL CHECK(status IN ('success', 'failure', 'running', 'cancelled', 'pending', 'skipped', 'timeout', 'unknown', 'unstable')),
        build_number INTEGER,
        build_time INTEGER,
        commit_hash VARCHAR(255),
        commit_message TEXT,
        branch VARCHAR(255),
        logs TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        external_id TEXT UNIQUE,
        github_run_id TEXT,
        github_workflow_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
      )
    `);

    // Add external_id column if it doesn't exist (for backward compatibility)
    this.db.run(`
      PRAGMA foreign_keys=off;
      BEGIN TRANSACTION;
      
      -- Create a temporary table with the new schema
      CREATE TABLE IF NOT EXISTS executions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL CHECK(status IN ('success', 'failure', 'running', 'cancelled', 'pending', 'skipped', 'timeout', 'unknown', 'unstable')),
        build_number INTEGER,
        build_time INTEGER,
        commit_hash VARCHAR(255),
        commit_message TEXT,
        branch VARCHAR(255),
        logs TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        external_id TEXT UNIQUE,
        github_run_id TEXT,
        github_workflow_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
      );
      
      -- Copy data from the old table
      INSERT OR IGNORE INTO executions_new 
        SELECT 
          id, pipeline_id, status, build_number, build_time, 
          commit_hash, commit_message, branch, logs, 
          started_at, completed_at, 
          CAST(github_run_id AS TEXT) as external_id, -- Use github_run_id as external_id if available
          github_run_id, github_workflow_id, created_at
        FROM executions;
      
      -- Drop the old table
      DROP TABLE executions;
      
      -- Rename the new table to the original name
      ALTER TABLE executions_new RENAME TO executions;
      
      COMMIT;
      PRAGMA foreign_keys=on;
    `);

    // Create alert_configs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alert_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_id INTEGER,
        alert_type VARCHAR(50) NOT NULL CHECK(alert_type = 'email'),
        webhook_url TEXT,
        email_address TEXT,
        is_enabled BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
      )
    `);

    // Create email_settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_id INTEGER,
        email_address TEXT NOT NULL,
        notify_on_started BOOLEAN DEFAULT 1,
        notify_on_success BOOLEAN DEFAULT 1,
        notify_on_failure BOOLEAN DEFAULT 1,
        notify_on_stopped BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
      )
    `);

    // Add missing columns to existing email_settings table (for backward compatibility)
    this.db.run(`ALTER TABLE email_settings ADD COLUMN notify_on_started BOOLEAN DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('notify_on_started column already exists or other error:', err.message);
      }
    });

    this.db.run(`ALTER TABLE email_settings ADD COLUMN notify_on_stopped BOOLEAN DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('notify_on_stopped column already exists or other error:', err.message);
      }
    });

    // Create notifications table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id INTEGER NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (execution_id) REFERENCES executions(id)
      )
    `);

    // Insert sample data
    this.insertSampleData();
  }

  insertSampleData() {
    // This method is now deprecated - real data will be imported via GitHub integration
    // No dummy data will be inserted
    console.log('✅ Database tables initialized. Import real pipelines via GitHub Integration.');
  }

  // Pipeline operations
  getAllPipelines() {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure database is connected
        if (!this.db) {
          await this.connect();
        }
        
        this.db.all(`
          SELECT p.*, 
                 COUNT(e.id) as execution_count,
                 MAX(e.completed_at) as last_execution,
                 (SELECT status FROM executions WHERE pipeline_id = p.id ORDER BY created_at DESC LIMIT 1) as last_status
          FROM pipelines p 
          LEFT JOIN executions e ON p.id = e.pipeline_id 
          GROUP BY p.id 
          ORDER BY p.created_at DESC
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getPipelineById(id) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM pipelines WHERE id = ?", [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getPipelineWithStats(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          p.*,
          COUNT(e.id) as execution_count,
          SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) as successful_builds,
          SUM(CASE WHEN e.status = 'failure' THEN 1 ELSE 0 END) as failed_builds,
          AVG(e.build_time) as avg_build_time,
          MAX(e.created_at) as last_build_date,
          (SELECT status FROM executions WHERE pipeline_id = p.id ORDER BY created_at DESC LIMIT 1) as last_status
        FROM pipelines p
        LEFT JOIN executions e ON p.id = e.pipeline_id
        WHERE p.id = ?
        GROUP BY p.id
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async createPipeline(name, type, repositoryUrl, webhookUrl) {
    // Function to check if a name exists
    const checkNameExists = (nameToCheck) => {
      return new Promise((resolve, reject) => {
        this.db.get("SELECT id FROM pipelines WHERE name = ?", [nameToCheck], (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        });
      });
    };

    // Function to generate a unique name
    const generateUniqueName = async (baseName) => {
      let finalName = baseName;
      let counter = 1;
      while (await checkNameExists(finalName)) {
        finalName = `${baseName} (${counter})`;
        counter++;
      }
      return finalName;
    };

    try {
      // Get a unique name
      const uniqueName = await generateUniqueName(name);

      return new Promise((resolve, reject) => {
        this.db.run(
          "INSERT INTO pipelines (name, type, repository_url, webhook_url) VALUES (?, ?, ?, ?)", 
          [uniqueName, type, repositoryUrl, webhookUrl], 
          function(err) {
            if (err) reject(err);
            else resolve({ 
              id: this.lastID, 
              name: uniqueName, 
              type, 
              repository_url: repositoryUrl, 
              webhook_url: webhookUrl, 
              is_active: 1 
            });
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }

  updatePipeline(id, name, type, repositoryUrl, webhookUrl, isActive) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE pipelines SET name = ?, type = ?, repository_url = ?, webhook_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [name, type, repositoryUrl, webhookUrl, isActive, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  updatePipelineGitHubFields(id, repositoryId, workflowId, webhookId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE pipelines SET github_repository_id = ?, github_workflow_id = ?, github_webhook_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [repositoryId, workflowId, webhookId, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  deletePipeline(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM pipelines WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // Execution operations
  getAllExecutions(pipelineId = null, limit = 50) {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure database is connected
        if (!this.db) {
          await this.connect();
        }
        
        let query = `
          SELECT e.*, p.name as pipeline_name, p.type as pipeline_type
          FROM executions e
          JOIN pipelines p ON e.pipeline_id = p.id
        `;
        let params = [];

        if (pipelineId) {
          query += " WHERE e.pipeline_id = ?";
          params.push(pipelineId);
        }

        query += " ORDER BY e.created_at DESC LIMIT ?";
        params.push(limit);

        this.db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getExecutionById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT e.*, p.name as pipeline_name, p.type as pipeline_type
        FROM executions e
        JOIN pipelines p ON e.pipeline_id = p.id
        WHERE e.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Get pipeline by repository URL
  getPipelineByRepoUrl(repoUrl) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM pipelines 
        WHERE repository_url = ? OR repository_url = ?
      `, [repoUrl, repoUrl + '.git'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Update pipeline with GitHub-specific information
  async updatePipelineGitHubInfo(pipelineId, workflowId, owner, repo, workflowName) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE pipelines 
        SET github_workflow_id = ?, 
            github_owner = ?, 
            github_repo = ?,
            github_workflow_name = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [workflowId, owner, repo, workflowName, pipelineId], 
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // Get the next build number for a pipeline
  getNextBuildNumber(pipelineId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT COALESCE(MAX(build_number), 0) + 1 as next_build_number
        FROM executions 
        WHERE pipeline_id = ?
      `, [pipelineId], (err, row) => {
        if (err) reject(err);
        else resolve(row.next_build_number);
      });
    });
  }

  createExecution(pipelineId, status, buildNumber, buildTime, commitHash, commitMessage, branch, logs, startedAt, completedAt, externalId = null) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO executions (pipeline_id, status, build_number, build_time, commit_hash, commit_message, branch, logs, started_at, completed_at, external_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [pipelineId, status, buildNumber, buildTime, commitHash, commitMessage, branch, logs, startedAt, completedAt, externalId], 
      function(err) {
        if (err) reject(err);
        else resolve({ 
          id: this.lastID, 
          pipeline_id: pipelineId, 
          status, 
          build_number: buildNumber,
          build_time: buildTime,
          commit_hash: commitHash,
          external_id: externalId
        });
      });
    });
  }

  // Create execution with auto-generated build number
  async createExecutionWithBuildNumber(pipelineId, status, buildTime, commitHash, commitMessage, branch, logs, startedAt, completedAt, externalId = null) {
    try {
      const buildNumber = await this.getNextBuildNumber(pipelineId);
      return await this.createExecution(pipelineId, status, buildNumber, buildTime, commitHash, commitMessage, branch, logs, startedAt, completedAt, externalId);
    } catch (error) {
      throw error;
    }
  }

  updateExecution(id, status, buildTime, logs, completedAt) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE executions SET status = ?, build_time = ?, logs = ?, completed_at = ? WHERE id = ?",
        [status, buildTime, logs, completedAt, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Get execution by external ID (GitHub run ID, etc.)
  getExecutionByExternalId(externalId) {
    return new Promise((resolve, reject) => {
      // First try the external_id column
      this.db.get("SELECT * FROM executions WHERE external_id = ? OR github_run_id = ?", [externalId, externalId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Update execution status and completion details
  updateExecutionStatus(id, status, completedAt = null, buildTime = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE executions SET status = ?, completed_at = ?, build_time = ? WHERE id = ?",
        [status, completedAt, buildTime, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Metrics operations
  getDashboardMetrics() {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure database is connected
        if (!this.db) {
          await this.connect();
        }
        
        // First check if we have any real pipelines (not just sample data)
        const pipelineCheck = await new Promise((res, rej) => {
          this.db.get("SELECT COUNT(*) as count FROM pipelines WHERE is_active = 1", (err, row) => {
            if (err) rej(err);
            else res(row);
          });
        });
        
        // If no active pipelines, return empty metrics
        if (pipelineCheck.count === 0) {
          resolve({
            totalPipelines: 0,
            totalExecutions: 0,
            successRate: 0,
            avgBuildTime: 0,
            lastBuildStatus: 'none',
            isEmpty: true
          });
          return;
        }
        
        const queries = [
          // Total pipelines
          "SELECT COUNT(*) as total_pipelines FROM pipelines WHERE is_active = 1",
          
          // Total executions
          "SELECT COUNT(*) as total_executions FROM executions",
          
          // Success rate
          `SELECT 
            COUNT(*) as total_completed,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
           FROM executions 
           WHERE status IN ('success', 'failure')`,
          
          // Average build time
          "SELECT AVG(build_time) as avg_build_time FROM executions WHERE build_time IS NOT NULL",
          
          // Last build status
          "SELECT status as last_build_status FROM executions ORDER BY created_at DESC LIMIT 1"
        ];

        Promise.all(queries.map(query => 
          new Promise((res, rej) => {
            this.db.get(query, (err, row) => {
              if (err) rej(err);
              else res(row);
            });
          })
        )).then(results => {
          const [totalPipelines, totalExecutions, successData, avgBuildTime, lastBuild] = results;
          
          const successRate = successData.total_completed > 0 
            ? (successData.successful / successData.total_completed * 100).toFixed(1) 
            : 0;

          resolve({
            totalPipelines: totalPipelines.total_pipelines,
            totalExecutions: totalExecutions.total_executions,
            successRate: parseFloat(successRate),
            avgBuildTime: Math.round(avgBuildTime.avg_build_time || 0),
            lastBuildStatus: lastBuild ? lastBuild.last_build_status : 'none',
            isEmpty: false
          });
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  getBuildTrends(days = 7) {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure database is connected
        if (!this.db) {
          await this.connect();
        }
        
        // First check if we have any executions
        const executionCheck = await new Promise((res, rej) => {
          this.db.get("SELECT COUNT(*) as count FROM executions", (err, row) => {
            if (err) rej(err);
            else res(row);
          });
        });
        
        // If no executions, return empty array
        if (executionCheck.count === 0) {
          resolve([]);
          return;
        }
        
        this.db.all(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_builds,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_builds,
            AVG(build_time) as avg_build_time
          FROM executions 
          WHERE created_at >= date('now', '-${days} days')
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Alert configuration operations
  getAlertConfigs(pipelineId = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT ac.*, p.name as pipeline_name
        FROM alert_configs ac
        LEFT JOIN pipelines p ON ac.pipeline_id = p.id
      `;
      let params = [];

      if (pipelineId) {
        query += " WHERE ac.pipeline_id = ?";
        params.push(pipelineId);
      }

      query += " ORDER BY ac.created_at DESC";

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async createAlertConfig(pipelineId, alertType, webhookUrl, emailAddress) {
    const database = this; // Store reference to access emailMethods
    
    return new Promise(async (resolve, reject) => {
      try {
        // Create the alert configuration
        database.db.run(
          "INSERT INTO alert_configs (pipeline_id, alert_type, webhook_url, email_address) VALUES (?, ?, ?, ?)", 
          [pipelineId, alertType, webhookUrl, emailAddress], 
          async function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            const alertConfig = {
              id: this.lastID, 
              pipeline_id: pipelineId, 
              alert_type: alertType, 
              webhook_url: webhookUrl,
              email_address: emailAddress,
              is_enabled: 1
            };

            // If this is an email alert, also create email settings for notifications
            if (alertType === 'email' && emailAddress) {
              try {
                await database.emailMethods.addEmailSettings(pipelineId, emailAddress, true, true);
                console.log(`✅ Email settings created for pipeline ${pipelineId} with email ${emailAddress}`);
              } catch (emailError) {
                console.error('Error creating email settings:', emailError);
                // Don't fail the alert creation if email settings fail
              }
            }
            
            resolve(alertConfig);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteAlertConfig(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM alert_configs WHERE id = ?", 
        [id], 
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          if (this.changes === 0) {
            reject(new Error('Alert configuration not found'));
            return;
          }
          resolve({ id: id, deleted: true });
        }
      );
    });
  }

  // Email settings methods
  async addEmailSettings(pipelineId, emailAddress, notifyOnSuccess = true, notifyOnFailure = true) {
    return this.emailMethods.addEmailSettings(pipelineId, emailAddress, notifyOnSuccess, notifyOnFailure);
  }

  async getEmailSettingsForPipeline(pipelineId) {
    return this.emailMethods.getEmailSettingsForPipeline(pipelineId);
  }

  async removeEmailSettings(id) {
    return this.emailMethods.removeEmailSettings(id);
  }

  async updateEmailSettings(id, emailAddress, notifyOnSuccess, notifyOnFailure) {
    return this.emailMethods.updateEmailSettings(id, emailAddress, notifyOnSuccess, notifyOnFailure);
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;
