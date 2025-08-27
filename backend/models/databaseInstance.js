const Database = require('./database');

// Singleton database instance
let databaseInstance = null;

module.exports = {
  getInstance: () => {
    if (!databaseInstance) {
      databaseInstance = new Database();
    }
    return databaseInstance;
  },
  
  setInstance: (instance) => {
    databaseInstance = instance;
  }
};
