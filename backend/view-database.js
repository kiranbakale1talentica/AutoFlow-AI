const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open database
const dbPath = path.resolve('./database.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 DATABASE CONTENTS:\n');

// View pipelines
db.all("SELECT * FROM pipelines", (err, rows) => {
  if (err) {
    console.error('Error reading pipelines:', err);
    return;
  }
  console.log('🔧 PIPELINES:');
  console.table(rows);
  
  // View executions
  db.all("SELECT * FROM executions LIMIT 10", (err, rows) => {
    if (err) {
      console.error('Error reading executions:', err);
      return;
    }
    console.log('\n▶️ EXECUTIONS (First 10):');
    console.table(rows);
    
    // View alert configs
    db.all("SELECT * FROM alert_configs", (err, rows) => {
      if (err) {
        console.error('Error reading alert_configs:', err);
        return;
      }
      console.log('\n🔔 ALERT CONFIGURATIONS:');
      console.table(rows);
      
      // View table info
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) {
          console.error('Error reading tables:', err);
          return;
        }
        console.log('\n📋 TABLES IN DATABASE:');
        console.table(rows);
        
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('\n✅ Database connection closed.');
          }
        });
      });
    });
  });
});
