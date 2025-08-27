const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open database
const dbPath = path.resolve('./database.db');
const db = new sqlite3.Database(dbPath);

console.log('🗑️  CLEARING ALL METRICS DATA AND AUTHENTICATED ACCOUNTS...\n');

async function clearAllData() {
  return new Promise((resolve, reject) => {
    // Start transaction
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Clear executions (metrics data)
      db.run("DELETE FROM executions", function(err) {
        if (err) {
          console.error('❌ Error clearing executions:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Cleared ${this.changes} execution records`);
      });

      // Clear pipelines (including GitHub authenticated pipelines)
      db.run("DELETE FROM pipelines", function(err) {
        if (err) {
          console.error('❌ Error clearing pipelines:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Cleared ${this.changes} pipeline records`);
      });

      // Clear alert configurations
      db.run("DELETE FROM alert_configs", function(err) {
        if (err) {
          console.error('❌ Error clearing alert configs:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Cleared ${this.changes} alert configuration records`);
      });

      // Clear notifications
      db.run("DELETE FROM notifications", function(err) {
        if (err) {
          console.error('❌ Error clearing notifications:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Cleared ${this.changes} notification records`);
      });

      // Clear user accounts (authenticated GitHub accounts)
      db.run("DELETE FROM users", function(err) {
        if (err) {
          console.error('❌ Error clearing users:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Cleared ${this.changes} user account records`);
      });

      // Clear OTP codes
      db.run("DELETE FROM otp_codes", function(err) {
        if (err) {
          console.error('❌ Error clearing OTP codes:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Cleared ${this.changes} OTP code records`);
      });

      // Clear email settings
      db.run("DELETE FROM email_settings", function(err) {
        if (err) {
          console.error('❌ Error clearing email settings:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Cleared ${this.changes} email setting records`);
      });

      // Reset auto-increment sequences
      db.run("DELETE FROM sqlite_sequence", function(err) {
        if (err) {
          console.error('❌ Error resetting sequences:', err);
          db.run("ROLLBACK");
          return reject(err);
        }
        console.log(`✅ Reset auto-increment sequences`);
      });

      // Commit transaction
      db.run("COMMIT", function(err) {
        if (err) {
          console.error('❌ Error committing transaction:', err);
          return reject(err);
        }
        console.log('\n🎉 All data cleared successfully!');
        console.log('\n📊 Database is now clean and ready for fresh data.');
        resolve();
      });
    });
  });
}

// Execute the clearing
clearAllData()
  .then(() => {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database connection closed.');
        console.log('\n🔄 You may need to restart the application for changes to take effect.');
      }
    });
  })
  .catch((error) => {
    console.error('❌ Failed to clear data:', error);
    db.close();
  });
