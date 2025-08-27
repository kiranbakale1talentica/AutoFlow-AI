const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Clear database and reset all metrics
async function clearDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = path.resolve('./database.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }

      console.log('🗄️ Connected to SQLite database');
      
      // Clear all executions
      db.run('DELETE FROM executions', (err) => {
        if (err) {
          console.error('Error clearing executions:', err);
          reject(err);
          return;
        }
        
        console.log('✅ Cleared all execution records');
        
        // Clear alert configs
        db.run('DELETE FROM alert_configs', (err) => {
          if (err) {
            console.error('Error clearing alert configs:', err);
            reject(err);
            return;
          }
          
          console.log('✅ Cleared all alert configurations');
          
          // Clear email settings
          db.run('DELETE FROM email_settings', (err) => {
            if (err) {
              console.error('Error clearing email settings:', err);
              reject(err);
              return;
            }
            
            console.log('✅ Cleared all email settings');
            
            // Keep pipelines but we could clear them too if needed
            // For now, let's keep pipelines so users don't lose their configurations
            
            console.log('🎉 Database reset complete! Metrics will now be accurate.');
            console.log('💡 Import your pipelines again to start fresh tracking.');
            
            db.close((err) => {
              if (err) console.error('Error closing database:', err);
              else console.log('📀 Database connection closed');
              resolve();
            });
          });
        });
      });
    });
  });
}

// Run the cleanup
clearDatabase()
  .then(() => {
    console.log('✅ Database cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  });
