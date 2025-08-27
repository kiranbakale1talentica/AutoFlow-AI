const crypto = require('crypto');
const UserDatabase = require('../models/userDatabase');
const emailService = require('./emailService');

class AuthService {
  constructor() {
    this.userDb = new UserDatabase();
  }

  async initialize() {
    await this.userDb.connect();
    await this.userDb.createUsersTable();
    await this.userDb.createOTPTable();
    
    // Create default admin user if no users exist
    await this.createDefaultAdmin();
  }

  async createDefaultAdmin() {
    try {
      const users = await this.userDb.getAllUsers();
      if (users.length === 0) {
        const adminUser = await this.userDb.createUser(
          'admin@autoflow.ai',
          'Admin',
          'User',
          'admin'
        );
        await this.userDb.updateUserVerification('admin@autoflow.ai', true);
        console.log('✅ Default admin user created: admin@autoflow.ai');
      }
    } catch (error) {
      console.error('Error creating default admin:', error);
    }
  }

  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendSignupOTP(email, firstName, lastName) {
    try {
      // Check if user already exists
      const existingUser = await this.userDb.getUserByEmail(email);
      if (existingUser && existingUser.email_verified) {
        throw new Error('User already exists with this email');
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP in database
      await this.userDb.createOTP(email, otp, 'signup', 10); // 10 minutes expiry

      // Try to send OTP email
      const emailResult = await emailService.sendEmail(
        email,
        'AutoFlow AI - Verify Your Account',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">AutoFlow AI</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Intelligent CI/CD Pipeline Dashboard</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome ${firstName}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for signing up for AutoFlow AI. Please use the following verification code to complete your registration:
            </p>
            
            <div style="background: #f8f9fa; border: 2px dashed #1976d2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #1976d2; letter-spacing: 4px;">${otp}</div>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">This code expires in 10 minutes</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If you didn't request this verification code, please ignore this email.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© 2025 AutoFlow AI. All rights reserved.</p>
          </div>
        </div>
        `
      );

      // If email service is not configured, enable development mode
      if (emailResult && emailResult.skipped) {
        console.log('⚠️  Email service not configured - Development mode enabled');
        console.log(`🔑 Development OTP for ${email}: ${otp}`);
        console.log('💡 In production, configure SMTP settings to send emails');
        
        return { 
          success: true, 
          message: 'Development mode: OTP generated. Check server logs for OTP.',
          developmentMode: true,
          otp: otp // Only for development
        };
      }

      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Error sending signup OTP:', error);
      throw error;
    }
  }

  async verifySignupOTP(email, otp, firstName, lastName) {
    try {
      // Verify OTP
      const isValidOTP = await this.userDb.verifyOTP(email, otp, 'signup');
      if (!isValidOTP) {
        throw new Error('Invalid or expired OTP');
      }

      // Check if user already exists
      let user = await this.userDb.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        user = await this.userDb.createUser(email, firstName, lastName, 'user');
      }

      // Mark user as verified
      await this.userDb.updateUserVerification(email, true);
      await this.userDb.updateLastLogin(email);

      return { 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Error verifying signup OTP:', error);
      throw error;
    }
  }

  async sendLoginOTP(email) {
    try {
      // Check if user exists and is verified
      const user = await this.userDb.getUserByEmail(email);
      if (!user || !user.email_verified) {
        throw new Error('User not found or not verified');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated. Please contact administrator.');
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP in database
      await this.userDb.createOTP(email, otp, 'login', 5); // 5 minutes expiry for login

      // Try to send OTP email
      const emailResult = await emailService.sendEmail(
        email,
        'AutoFlow AI - Login Verification',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">AutoFlow AI</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Intelligent CI/CD Pipeline Dashboard</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Login Verification</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Please use the following verification code to login to your AutoFlow AI account:
            </p>
            
            <div style="background: #f8f9fa; border: 2px dashed #1976d2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #1976d2; letter-spacing: 4px;">${otp}</div>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">This code expires in 5 minutes</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If you didn't request this login code, please ignore this email and consider changing your password.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© 2025 AutoFlow AI. All rights reserved.</p>
          </div>
        </div>
        `
      );

      // If email service is not configured, enable development mode
      if (emailResult && emailResult.skipped) {
        console.log('⚠️  Email service not configured - Development mode enabled');
        console.log(`🔑 Development Login OTP for ${email}: ${otp}`);
        console.log('💡 In production, configure SMTP settings to send emails');
        
        return { 
          success: true, 
          message: 'Development mode: Login OTP generated. Check server logs for OTP.',
          developmentMode: true,
          otp: otp // Only for development
        };
      }

      return { success: true, message: 'Login OTP sent successfully' };
    } catch (error) {
      console.error('Error sending login OTP:', error);
      throw error;
    }
  }

  async verifyLoginOTP(email, otp) {
    try {
      // Verify OTP
      const isValidOTP = await this.userDb.verifyOTP(email, otp, 'login');
      if (!isValidOTP) {
        throw new Error('Invalid or expired OTP');
      }

      // Get user details
      const user = await this.userDb.getUserByEmail(email);
      if (!user || !user.is_active) {
        throw new Error('User not found or account deactivated');
      }

      // Update last login
      await this.userDb.updateLastLogin(email);

      return { 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Error verifying login OTP:', error);
      throw error;
    }
  }

  // Admin functions
  async getAllUsers() {
    try {
      return await this.userDb.getAllUsers();
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async updateUserStatus(userId, isActive) {
    try {
      return await this.userDb.updateUserStatus(userId, isActive);
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, firstName, lastName) {
    try {
      return await this.userDb.updateUserProfile(userId, firstName, lastName);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async cleanExpiredOTPs() {
    try {
      return await this.userDb.cleanExpiredOTPs();
    } catch (error) {
      console.error('Error cleaning expired OTPs:', error);
      throw error;
    }
  }
}

// Export singleton instance
const authService = new AuthService();
module.exports = authService;
