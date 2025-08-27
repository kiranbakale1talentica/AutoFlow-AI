# 🚀 GitHub Pipeline Onboarding Guide

## **Complete Step-by-Step Guide to Connect Real GitHub Repositories**

This guide will walk you through connecting your real GitHub repositories to the CI/CD Pipeline Health Dashboard, enabling automatic pipeline monitoring and webhook integration.

---

## **📋 Prerequisites**

✅ **Application Running:**
- Backend server on `http://localhost:5000`
- Frontend dashboard on `http://localhost:3000`

✅ **GitHub Account:**
- Active GitHub account with repositories
- Administrative access to repositories you want to monitor
- Repositories with GitHub Actions workflows (recommended)

---

## **🔧 Step 1: Create GitHub OAuth Application**

### **1.1 Navigate to GitHub Developer Settings**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"**

### **1.2 Configure OAuth Application**
Fill in the following details:

```
Application name: CI/CD Pipeline Health Dashboard
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:5000/auth/github/callback
Application description: Monitor CI/CD pipelines and automate notifications
```

### **1.3 Save Credentials**
After creating the app, you'll receive:
- **Client ID** (public, safe to expose)
- **Client Secret** (private, keep secure)

**📝 Important:** Copy both values immediately - the secret is only shown once!

---

## **🔑 Step 2: Configure Backend Authentication**

### **2.1 Update Environment Variables**
Edit `backend/config/env.js` and replace the placeholder values:

```javascript
// GitHub OAuth Configuration (REPLACE WITH YOUR ACTUAL VALUES)
GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'your_actual_github_client_id',
GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'your_actual_github_client_secret',
```

**Example:**
```javascript
GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'Iv1.a629723c54321234',
GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'your_actual_secret_here',
```

### **2.2 Restart Backend Server**
```bash
cd backend
npm run dev
```

---

## **🎯 Step 3: Connect GitHub Account**

### **3.1 Access GitHub Integration**
1. Open your dashboard: `http://localhost:3000`
2. Navigate to **"Pipelines"** page
3. Click on **"GitHub Integration"** tab

### **3.2 Authenticate with GitHub**
1. Click **"Connect GitHub Account"**
2. You'll be redirected to GitHub OAuth page
3. Review permissions and click **"Authorize"**
4. You'll be redirected back to the dashboard

**🔒 Permissions Requested:**
- `user:email` - Access your email address
- `repo` - Access your repositories
- `admin:repo_hook` - Create webhooks for real-time updates

---

## **📦 Step 4: Import Your Repositories**

### **4.1 Load Your Repositories**
After authentication, click **"Load Repositories"** to fetch your GitHub repos.

### **4.2 Select Repositories to Import**
You'll see a list of your repositories with the following information:
- Repository name and description
- Programming language
- Privacy status (public/private)
- **GitHub Actions workflows** (if any)

### **4.3 Import as Pipeline**
For repositories with workflows:
1. Click the **➕ (Add)** icon next to the repository
2. Select which workflow to monitor
3. Click **"Import Pipeline"**

**✅ What Happens:**
- Creates a pipeline entry in the database
- Sets up webhook URL for real-time updates
- Attempts to create webhook on GitHub repository

---

## **⚡ Step 5: Sync Historical Data**

### **5.1 Sync Recent Workflow Runs**
After importing a pipeline:
1. Click the **🔄 (Sync)** icon next to the repository
2. This imports recent workflow execution history
3. Data appears in the dashboard immediately

### **5.2 View Synced Data**
Navigate to:
- **Dashboard** - See aggregated metrics
- **Executions** - View detailed build history
- **Charts** - Analyze build trends

---

## **🔔 Step 6: Configure Webhooks (Optional)**

### **6.1 Automatic Webhook Creation**
The application automatically attempts to create webhooks when you import a pipeline.

### **6.2 Manual Webhook Setup** (if automatic fails)
If webhook creation fails, set it up manually:

1. Go to your repository on GitHub
2. Navigate to **Settings → Webhooks**
3. Click **"Add webhook"**
4. Configure:
   ```
   Payload URL: http://localhost:5000/api/webhooks/github
   Content type: application/json
   Events: Check "Workflow runs" and "Push"
   ```

### **6.3 Webhook Events**
The webhook listens for:
- `workflow_run` - Workflow execution status
- `workflow_job` - Individual job status
- `push` - New commits
- `pull_request` - PR events

---

## **📊 Step 7: Set Up Alerts and Notifications**

### **7.1 Configure Slack Alerts**
1. Go to **"Alerts"** page
2. Click **"Setup Slack Alert"**
3. Enter your Slack webhook URL
4. Test the alert

### **7.2 Configure Email Alerts**
1. Click **"Setup Email Alert"**
2. Enter email address
3. Test the notification

---

## **🔧 Step 8: Advanced Configuration**

### **8.1 Webhook Security** (Production)
For production deployments, secure your webhooks:

```javascript
// In backend/config/env.js
WEBHOOK_SECRET: 'your_secure_webhook_secret_here'
```

### **8.2 Environment Variables** (Production)
Create a proper `.env` file:

```bash
# Production .env file
GITHUB_CLIENT_ID=your_actual_client_id
GITHUB_CLIENT_SECRET=your_actual_client_secret
GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback
WEBHOOK_SECRET=your_webhook_secret
SESSION_SECRET=your_session_secret
```

---

## **🚨 Troubleshooting**

### **Common Issues:**

**❌ "GitHub authentication required"**
- Ensure OAuth app is configured correctly
- Check client ID/secret in `backend/config/env.js`
- Restart backend server after changes

**❌ "Failed to create webhook"**
- Verify you have admin access to the repository
- Check if webhook already exists
- Set up webhook manually (see Step 6.2)

**❌ "No workflow runs found"**
- Ensure repository has GitHub Actions workflows
- Check workflow has been triggered at least once
- Verify workflow files are in `.github/workflows/`

**❌ OAuth callback error**
- Verify callback URL matches exactly: `http://localhost:5000/auth/github/callback`
- Check OAuth app configuration on GitHub
- Ensure backend server is running on port 5000

### **Debug Steps:**

1. **Check Backend Logs:**
   ```bash
   cd backend
   npm run dev
   # Watch console for error messages
   ```

2. **Test API Endpoints:**
   ```bash
   # Test health endpoint
   curl http://localhost:5000/api/health
   
   # Test auth status (after login)
   curl http://localhost:5000/auth/user --cookie-jar cookies.txt
   ```

3. **Verify Database:**
   ```bash
   cd backend
   node view-database.js
   ```

---

## **✅ Success Checklist**

After completing the setup, you should have:

- [ ] ✅ GitHub OAuth app created and configured
- [ ] ✅ Backend environment variables updated
- [ ] ✅ Successfully authenticated with GitHub
- [ ] ✅ Repositories loaded and visible
- [ ] ✅ At least one pipeline imported
- [ ] ✅ Webhook created (automatically or manually)
- [ ] ✅ Historical workflow runs synced
- [ ] ✅ Real-time dashboard updates working
- [ ] ✅ Alerts configured (optional)

---

## **🎉 What You Can Do Now**

With your GitHub integration complete, you can:

### **📈 Monitor in Real-Time:**
- View build success rates and trends
- Get notified of pipeline failures immediately
- Track build times and performance metrics

### **📊 Analyze Performance:**
- Compare pipeline performance across repositories
- Identify bottlenecks and optimization opportunities
- Track team productivity and deployment frequency

### **🔔 Stay Informed:**
- Receive Slack/email alerts for failures
- Get summaries of daily build activity
- Monitor critical deployment pipelines

### **🔧 Manage Pipelines:**
- Enable/disable monitoring for specific repositories
- Configure custom alert thresholds
- Sync new workflow runs on demand

---

## **🚀 Next Steps**

### **Scale Your Setup:**
1. **Add More Repositories:** Import additional repos following Step 4
2. **Team Integration:** Share OAuth app with team members
3. **Custom Dashboards:** Create repository-specific views
4. **Advanced Alerts:** Set up escalation rules and custom notifications

### **Production Deployment:**
1. **Deploy to Cloud:** Use services like Heroku, AWS, or DigitalOcean
2. **Custom Domain:** Set up proper domain and HTTPS
3. **Database:** Migrate to PostgreSQL or MySQL for production
4. **Monitoring:** Add application monitoring and logging

### **Extend Functionality:**
1. **Additional Integrations:** Connect with other CI/CD platforms
2. **Custom Metrics:** Track custom KPIs and business metrics
3. **API Integration:** Connect with other DevOps tools
4. **Reporting:** Generate automated reports and insights

---

**🎯 You now have a fully functional CI/CD Pipeline Health Dashboard connected to your real GitHub repositories!**

For support or questions, check the application logs or refer to the GitHub repository documentation.
