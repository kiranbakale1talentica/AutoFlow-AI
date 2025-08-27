const sqlite3 = require('sqlite3').verbose();
const config = require('../../config/config');
const path = require('path');

function createEmailSettingsTable(existingDatabase = null) {
  // Use existing database connection if provided, otherwise create new one
  let db;
  let shouldClose = false;
  
  if (existingDatabase && existingDatabase.db) {
    db = existingDatabase.db;
  } else {
    const dbPath = path.resolve(config.dbPath);
    db = new sqlite3.Database(dbPath);
    shouldClose = true;
  }

  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_id INTEGER NOT NULL,
        email_address TEXT NOT NULL,
        notify_on_success BOOLEAN DEFAULT 1,
        notify_on_failure BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_id) REFERENCES pipelines (id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating email_settings table:', err);
        if (shouldClose) db.close();
        reject(err);
      } else {
        console.log('✅ Email settings table created successfully');
        if (shouldClose) db.close();
        resolve();
      }
    });
  });
}

module.exports = createEmailSettingsTable;
