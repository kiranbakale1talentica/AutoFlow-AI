const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Check if email credentials are configured properly
    const hasCredentials = process.env.SMTP_USER && 
                          process.env.SMTP_PASS && 
                          process.env.SMTP_USER !== 'your_email@gmail.com' && 
                          process.env.SMTP_PASS !== 'your_app_password' &&
                          process.env.SMTP_USER !== '' &&
                          process.env.SMTP_PASS !== '';
    
    // Log email configuration (without sensitive data)
    console.log('📧 Initializing Email Service with config:', {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER ? '***configured***' : '***missing***',
      enabled: hasCredentials
    });

    if (!hasCredentials) {
      console.log('⚠️  Email service disabled - Missing or placeholder SMTP credentials');
      console.log('💡 Configure SMTP_USER and SMTP_PASS in .env to enable email notifications');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email service configuration error:', error.message);
        console.log('💡 Email notifications will be disabled until SMTP issues are resolved');
        this.transporter = null;
      } else {
        console.log('✅ Email service is ready to send emails');
      }
    });
  }

  async sendPipelineNotification({ 
    to,
    pipelineName,
    status,
    eventType,
    failedStage,
    executionTime,
    triggeredBy,
    runUrl,
    startedAt,
    completedAt
  }) {
    // Check if email service is available
    if (!this.transporter) {
      console.log('📧 Email notification skipped - Email service not configured');
      return false;
    }

    const eventData = this.getEventData(eventType || status);
    const statusColor = eventData.color;
    const statusEmoji = eventData.emoji;
    const eventMessage = eventData.message;

    const executionTimeFormatted = executionTime ? 
      executionTime > 3600 
        ? `${Math.floor(executionTime / 3600)}h ${Math.floor((executionTime % 3600) / 60)}m` 
        : executionTime > 60 
          ? `${Math.floor(executionTime / 60)}m ${executionTime % 60}s` 
          : `${executionTime}s`
      : 'N/A';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Pipeline ${eventMessage}</h2>
        
        <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: ${statusColor}; margin-top: 0;">
            ${statusEmoji} Pipeline: ${pipelineName}
          </h3>
          <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
            <strong>Event:</strong> 
            <span style="color: ${statusColor}; font-weight: bold;">${eventMessage.toUpperCase()}</span>
          </p>
          <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
            <strong>Status:</strong> 
            <span style="color: ${statusColor}; font-weight: bold;">${status.toUpperCase()}</span>
          </p>
          ${failedStage ? `
            <p style="color: #dc3545; font-size: 16px; margin-bottom: 10px;">
              <strong>Failed Stage:</strong> ${failedStage}
            </p>
          ` : ''}
          ${eventType !== 'started' ? `
            <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
              <strong>Execution Time:</strong> ${executionTimeFormatted}
            </p>
          ` : ''}
          <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
            <strong>Triggered By:</strong> ${triggeredBy}
          </p>
          ${startedAt ? `
            <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
              <strong>Started At:</strong> ${new Date(startedAt).toLocaleString()}
            </p>
          ` : ''}
          ${completedAt && eventType !== 'started' ? `
            <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
              <strong>Completed At:</strong> ${new Date(completedAt).toLocaleString()}
            </p>
          ` : ''}
        </div>

        ${runUrl ? `
          <div style="text-align: center;">
            <a href="${runUrl}" 
               style="display: inline-block; background-color: #0366d6; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Pipeline Run
            </a>
          </div>
        ` : ''}

        <div style="color: #666; font-size: 12px; margin-top: 20px; text-align: center;">
          Sent by Autoflow AI - CI/CD Pipeline Dashboard
        </div>
      </div>
    `;

    try {
      console.log('📧 Attempting to send email to:', to);
      
      // Verify SMTP connection before sending
      await this.transporter.verify();
      
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Autoflow AI" <no-reply@autoflow.ai>',
        to,
        subject: `[${eventMessage.toUpperCase()}] Pipeline: ${pipelineName}`,
        html: htmlContent
      });

      console.log('📧 Pipeline notification email sent successfully', {
        messageId: info.messageId,
        response: info.response,
        to: to,
        eventType: eventType || status
      });

      return true;
    } catch (error) {
      console.error('❌ Error sending pipeline notification email:', {
        error: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      if (error.code === 'EAUTH') {
        console.error('Authentication failed. Please check your SMTP credentials.');
      } else if (error.code === 'ESOCKET') {
        console.error('Connection failed. Please check your SMTP host and port settings.');
      }
      
      return false;
    }
  }

  getEventData(eventType) {
    switch (eventType) {
      case 'started':
        return {
          emoji: '🚀',
          color: '#17a2b8',
          message: 'Started'
        };
      case 'success':
        return {
          emoji: '✅',
          color: '#28a745',
          message: 'Completed Successfully'
        };
      case 'failure':
        return {
          emoji: '❌',
          color: '#dc3545',
          message: 'Failed'
        };
      case 'stopped':
        return {
          emoji: '⏹️',
          color: '#ffc107',
          message: 'Stopped'
        };
      default:
        return {
          emoji: '⚠️',
          color: '#ffc107',
          message: 'Updated'
        };
    }
  }

  async sendEmail(to, subject, html, text = null) {
    // Check if email service is available
    if (!this.transporter) {
      console.log('📧 Email sending skipped - Email service not configured');
      return {
        success: false,
        skipped: true,
        message: 'Email service not configured'
      };
    }

    try {
      const mailOptions = {
        from: `"AutoFlow AI" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: to,
        subject: subject
      });
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send email:', {
        to: to,
        subject: subject,
        error: error.message
      });
      throw error;
    }
  }

  async sendTestEmail(to, message = 'Test email from CI/CD Dashboard') {
    // Check if email service is available
    if (!this.transporter) {
      console.log('📧 Test email skipped - Email service not configured');
      return {
        success: false,
        skipped: true,
        message: 'Email service not configured. Please configure SMTP settings.'
      };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">🧪 Test Email from Autoflow AI</h2>
        
        <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
            ${message}
          </p>
          <p style="color: #28a745; font-size: 14px;">
            ✅ If you're reading this, your email configuration is working correctly!
          </p>
        </div>

        <div style="background-color: #e9ecef; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
          <h4 style="color: #495057; margin-top: 0;">Email Service Details:</h4>
          <ul style="color: #666; margin: 0; padding-left: 20px;">
            <li>SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
            <li>Port: ${process.env.SMTP_PORT || 587}</li>
            <li>Security: ${process.env.SMTP_SECURE === 'true' ? 'SSL/TLS' : 'STARTTLS'}</li>
            <li>Sent: ${new Date().toLocaleString()}</li>
          </ul>
        </div>

        <div style="color: #666; font-size: 12px; margin-top: 20px; text-align: center;">
          Sent by Autoflow AI - CI/CD Pipeline Dashboard<br>
          <em>This is a test email to verify your email configuration</em>
        </div>
      </div>
    `;

    try {
      console.log('📧 Sending test email to:', to);
      
      // Verify SMTP connection before sending
      await this.transporter.verify();
      
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Autoflow AI" <no-reply@autoflow.ai>',
        to,
        subject: '🧪 Test Email from Autoflow AI - CI/CD Dashboard',
        html: htmlContent
      });

      console.log('📧 Test email sent successfully', {
        messageId: info.messageId,
        response: info.response,
        to: to
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Error sending test email:', {
        error: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      });
      
      if (error.code === 'EAUTH') {
        console.error('Authentication failed. Please check your SMTP credentials.');
      } else if (error.code === 'ESOCKET') {
        console.error('Connection failed. Please check your SMTP host and port settings.');
      }
      
      throw error;
    }
  }
}

module.exports = new EmailService();
