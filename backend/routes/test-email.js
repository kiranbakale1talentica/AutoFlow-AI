const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { authenticate } = require('../middleware/auth');

// Test email endpoint - requires authentication
router.post('/test-email', authenticate, async (req, res) => {
  try {
    const result = await emailService.sendPipelineNotification({
      to: req.body.to,
      pipelineName: "Test Pipeline",
      status: "success",
      executionTime: 65,
      triggeredBy: "Email Test",
      runUrl: null
    });

    if (result) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
