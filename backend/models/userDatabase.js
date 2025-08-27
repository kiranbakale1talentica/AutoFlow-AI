const Database = require('./database');

class UserDatabase extends Database {
  async createUsersTable() {
    return new Promise((resolve, reject) => {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          first_name TEXT,
          last_name TEXT,
          role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
          is_active BOOLEAN DEFAULT 1,
          email_verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login_at DATETIME
        )
      `;

      this.db.run(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        } else {
          console.log('✅ Users table created or verified');
          resolve();
        }
      });
    });
  }

  async createOTPTable() {
    return new Promise((resolve, reject) => {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS otp_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          otp_code TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('signup', 'login', 'password_reset')),
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating OTP table:', err);
          reject(err);
        } else {
          console.log('✅ OTP codes table created or verified');
          resolve();
        }
      });
    });
  }

  async createUser(email, firstName, lastName, role = 'user') {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (email, first_name, last_name, role)
        VALUES (?, ?, ?, ?)
      `;

      this.db.run(query, [email, firstName, lastName, role], function(err) {
        if (err) {
          console.error('Error creating user:', err);
          reject(err);
        } else {
          console.log(`✅ User created with ID: ${this.lastID}`);
          resolve({
            id: this.lastID,
            email,
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: 1,
            email_verified: 0
          });
        }
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      
      this.db.get(query, [email], (err, row) => {
        if (err) {
          console.error('Error getting user by email:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      
      this.db.get(query, [id], (err, row) => {
        if (err) {
          console.error('Error getting user by ID:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async updateUserVerification(email, verified = true) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?';
      
      this.db.run(query, [verified ? 1 : 0, email], function(err) {
        if (err) {
          console.error('Error updating user verification:', err);
          reject(err);
        } else {
          console.log(`✅ User ${email} verification updated to ${verified}`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async updateLastLogin(email) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE email = ?';
      
      this.db.run(query, [email], function(err) {
        if (err) {
          console.error('Error updating last login:', err);
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async createOTP(email, otpCode, type, expiresInMinutes = 10) {
    return new Promise((resolve, reject) => {
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
      const query = `
        INSERT INTO otp_codes (email, otp_code, type, expires_at)
        VALUES (?, ?, ?, ?)
      `;

      this.db.run(query, [email, otpCode, type, expiresAt], function(err) {
        if (err) {
          console.error('Error creating OTP:', err);
          reject(err);
        } else {
          console.log(`✅ OTP created for ${email}, expires at ${expiresAt}`);
          resolve({
            id: this.lastID,
            email,
            otp_code: otpCode,
            type,
            expires_at: expiresAt
          });
        }
      });
    });
  }

  async verifyOTP(email, otpCode, type) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM otp_codes 
        WHERE email = ? AND otp_code = ? AND type = ? AND used = 0 AND expires_at > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      this.db.get(query, [email, otpCode, type], (err, row) => {
        if (err) {
          console.error('Error verifying OTP:', err);
          reject(err);
        } else if (!row) {
          resolve(false);
        } else {
          // Mark OTP as used
          this.markOTPAsUsed(row.id)
            .then(() => resolve(true))
            .catch(reject);
        }
      });
    });
  }

  async markOTPAsUsed(otpId) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE otp_codes SET used = 1 WHERE id = ?';
      
      this.db.run(query, [otpId], function(err) {
        if (err) {
          console.error('Error marking OTP as used:', err);
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async cleanExpiredOTPs() {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM otp_codes WHERE expires_at < datetime('now')";
      
      this.db.run(query, function(err) {
        if (err) {
          console.error('Error cleaning expired OTPs:', err);
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`🧹 Cleaned ${this.changes} expired OTP codes`);
          }
          resolve(this.changes);
        }
      });
    });
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, last_login_at FROM users ORDER BY created_at DESC';
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error getting all users:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async updateUserStatus(userId, isActive) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(query, [isActive ? 1 : 0, userId], function(err) {
        if (err) {
          console.error('Error updating user status:', err);
          reject(err);
        } else {
          console.log(`✅ User ${userId} status updated to ${isActive ? 'active' : 'inactive'}`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async updateUserRole(userId, role) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(query, [role, userId], function(err) {
        if (err) {
          console.error('Error updating user role:', err);
          reject(err);
        } else {
          console.log(`✅ User ${userId} role updated to ${role}`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async deleteUser(userId) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM users WHERE id = ?';
      
      this.db.run(query, [userId], function(err) {
        if (err) {
          console.error('Error deleting user:', err);
          reject(err);
        } else {
          console.log(`✅ User ${userId} deleted`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async verifyUser(userId) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(query, [userId], function(err) {
        if (err) {
          console.error('Error verifying user:', err);
          reject(err);
        } else {
          console.log(`✅ User ${userId} verified`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async updateUserProfile(userId, firstName, lastName) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(query, [firstName, lastName, userId], function(err) {
        if (err) {
          console.error('Error updating user profile:', err);
          reject(err);
        } else {
          console.log(`✅ User ${userId} profile updated`);
          resolve(this.changes > 0);
        }
      });
    });
  }
}

module.exports = UserDatabase;
