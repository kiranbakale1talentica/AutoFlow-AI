const emailService = require('./emailService');

class AuthEmailService {
  async sendAuthFailedNotification(userEmail, attemptDetails) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545; margin-bottom: 20px;">🚫 Authentication Failed</h2>
          
          <div style="background-color: #f8d7da; border-radius: 5px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin-top: 0;">
              Unauthorized Access Attempt Detected
            </h3>
            <p style="color: #721c24; font-size: 16px; margin-bottom: 10px;">
              <strong>Time:</strong> ${new Date().toLocaleString()}
            </p>
            <p style="color: #721c24; font-size: 16px; margin-bottom: 10px;">
              <strong>IP Address:</strong> ${attemptDetails.ip || 'Unknown'}
            </p>
            <p style="color: #721c24; font-size: 16px; margin-bottom: 10px;">
              <strong>User Agent:</strong> ${attemptDetails.userAgent || 'Unknown'}
            </p>
            <p style="color: #721c24; font-size: 16px; margin-bottom: 10px;">
              <strong>Attempted Action:</strong> ${attemptDetails.action || 'Unknown'}
            </p>
          </div>

          <div style="background-color: #d1ecf1; border-radius: 5px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #0c5460;">
            <p style="color: #0c5460; margin: 0;">
              <strong>Security Tip:</strong> If this was not you, please contact your system administrator immediately.
            </p>
          </div>

          <div style="color: #666; font-size: 12px; margin-top: 20px; text-align: center;">
            Sent by Autoflow AI - Security Monitoring System
          </div>
        </div>
      `;

      await emailService.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Autoflow AI Security" <security@autoflow.ai>',
        to: userEmail,
        subject: '🚫 Authentication Failed - Autoflow AI',
        html: htmlContent
      });

      console.log('🔐 Authentication failure notification sent to:', userEmail);
      return true;
    } catch (error) {
      console.error('Error sending authentication failure notification:', error);
      return false;
    }
  }
}

module.exports = new AuthEmailService();
