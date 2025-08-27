const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open database
const dbPath = path.resolve('./database.db');
const db = new sqlite3.Database(dbPath);

console.log('🗑️ CLEARING DATABASE...\n');

// Clear all tables in the correct order (to avoid foreign key constraints)
const clearQueries = [
  'DELETE FROM executions;',
  'DELETE FROM alert_configs;', 
  'DELETE FROM notifications;',
  'DELETE FROM pipelines;',
  'DELETE FROM email_settings;',
  'DELETE FROM sqlite_sequence;' // Reset auto-increment counters
];

let completed = 0;
const total = clearQueries.length;

clearQueries.forEach((query, index) => {
  db.run(query, function(err) {
    if (err) {
      console.error(`❌ Error executing query ${index + 1}:`, err);
    } else {
      console.log(`✅ Query ${index + 1}/${total} completed: ${query}`);
    }
    
    completed++;
    if (completed === total) {
      console.log('\n🎉 Database cleared successfully!');
      console.log('📊 You can now add only the pipelines you want.\n');
      
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('✅ Database connection closed.');
        }
      });
    }
  });
});
