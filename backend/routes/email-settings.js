const express = require('express');
const router = express.Router();
const Database = require('../models/database');
const { authenticate } = require('../middleware/auth');

const database = new Database();

// Get email settings for a pipeline
router.get('/pipelines/:id/email-settings', async (req, res) => {
  try {
    await database.connect();
    const settings = await database.getEmailSettingsForPipeline(req.params.id);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// Add email settings for a pipeline
router.post('/pipelines/:id/email-settings', async (req, res) => {
  try {
    const { emailAddress, notifyOnSuccess = true, notifyOnFailure = true } = req.body;
    
    if (!emailAddress) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    await database.connect();
    const settings = await database.addEmailSettings(
      req.params.id,
      emailAddress,
      notifyOnSuccess,
      notifyOnFailure
    );

    res.status(201).json(settings);
  } catch (error) {
    console.error('Error adding email settings:', error);
    res.status(500).json({ error: 'Failed to add email settings' });
  }
});

// Update email settings
router.put('/pipelines/:pipelineId/email-settings/:id', async (req, res) => {
  try {
    const { emailAddress, notifyOnSuccess, notifyOnFailure } = req.body;
    
    if (!emailAddress) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    await database.connect();
    await database.updateEmailSettings(
      req.params.id,
      emailAddress,
      notifyOnSuccess,
      notifyOnFailure
    );

    res.json({ message: 'Email settings updated successfully' });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

// Delete email settings
router.delete('/pipelines/:pipelineId/email-settings/:id', async (req, res) => {
  try {
    await database.connect();
    await database.removeEmailSettings(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting email settings:', error);
    res.status(500).json({ error: 'Failed to delete email settings' });
  }
});

module.exports = router;
