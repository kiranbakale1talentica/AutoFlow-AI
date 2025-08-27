// Email settings methods for the Database class
class DatabaseEmailMethods {
  constructor(db) {
    this.db = db;
  }

  async addEmailSettings(pipelineId, emailAddress, notifyOnSuccess = true, notifyOnFailure = true) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO email_settings (pipeline_id, email_address, notify_on_success, notify_on_failure) 
        VALUES (?, ?, ?, ?)
      `, [pipelineId, emailAddress, notifyOnSuccess, notifyOnFailure], 
      function(err) {
        if (err) reject(err);
        else resolve({ 
          id: this.lastID, 
          pipeline_id: pipelineId, 
          email_address: emailAddress,
          notify_on_success: notifyOnSuccess,
          notify_on_failure: notifyOnFailure
        });
      });
    });
  }

  async getEmailSettingsForPipeline(pipelineId) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM email_settings 
        WHERE pipeline_id = ?
      `, [pipelineId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async removeEmailSettings(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM email_settings WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async updateEmailSettings(id, emailAddress, notifyOnSuccess, notifyOnFailure) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE email_settings 
        SET email_address = ?, notify_on_success = ?, notify_on_failure = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [emailAddress, notifyOnSuccess, notifyOnFailure, id], 
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
}

module.exports = DatabaseEmailMethods;
