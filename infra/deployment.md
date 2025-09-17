# AutoFlow-AI Infrastructure Deployment Guide

## What You'll Build
This guide will help you deploy a complete CI/CD Pipeline Health Dashboard on AWS with:
- A web application running on a single server
- A database to store your data
- A load balancer to handle web traffic
- Secure networking with proper access controls

## Before You Start

### 1. Install Required Tools
**Terraform** (Infrastructure management tool):
- Download from: https://www.terraform.io/downloads.html
- Install and verify: `terraform --version`

**AWS CLI** (Amazon Web Services command line):
- Download from: https://aws.amazon.com/cli/
- Install and verify: `aws --version`

### 2. Set Up AWS Account
1. Create an AWS account at https://aws.amazon.com/
2. Create an IAM user with administrator permissions
3. Save your Access Key ID and Secret Access Key
4. Configure AWS CLI:
   ```bash
   aws configure
   ```
   Enter your Access Key ID, Secret Access Key, region (us-east-1), and output format (json)

### 3. Create EC2 Key Pair
1. Go to AWS Console → EC2 → Key Pairs
2. Click "Create Key Pair"
3. Name it (e.g., "autoflow-key")
4. Choose .pem format
5. Download and save the .pem file securely
6. **Remember this name - you'll need it later!**

## Step-by-Step Deployment

### Step 1: Set Up State Storage (First Time Only)
This creates a secure place to store your infrastructure configuration.

```bash
# Navigate to bootstrap folder
cd infra/bootstrap

# Initialize Terraform
terraform init

# See what will be created
terraform plan

# Create the storage bucket
terraform apply
```
Type `yes` when prompted.

### Step 2: Configure Your Deployment
Navigate to the production environment:
```bash
cd ../environments/production
```

Create a file called `terraform.tfvars` with your settings:
```bash
# On Windows
notepad terraform.tfvars

# On Mac/Linux  
nano terraform.tfvars
```

Add this content (replace with your actual key pair name):
```hcl
key_pair_name = "autoflow-key"  # CHANGE THIS to your key pair name
project_name = "autoflow-ai"
environment = "production"
aws_region = "us-east-1"
```

### Step 3: Deploy Your Infrastructure
```bash
# Initialize Terraform with modules
terraform init

# Check your configuration is valid
terraform validate

# See what will be created (review carefully!)
terraform plan

# Deploy everything (this takes ~10-15 minutes)
terraform apply
```
Type `yes` when prompted to proceed.

### Step 4: Access Your Application
After deployment completes, get your application URL:
```bash
terraform output application_url
```

Open this URL in your browser to access your AutoFlow-AI dashboard!

## What Got Created?

### Infrastructure Components
- **EC2 Server**: Runs your web application (frontend + backend)
- **RDS Database**: PostgreSQL database for storing data
- **Load Balancer**: Distributes traffic and provides a stable URL
- **VPC Network**: Secure private network with public and private subnets
- **Security Groups**: Firewall rules protecting your resources

### Network Layout
```
Internet → Load Balancer → EC2 Server → RDS Database
           (Public)        (Public)     (Private)
```

## Troubleshooting Common Issues

### Error: "Key pair not found"
- Make sure you created the EC2 key pair in the AWS console
- Double-check the name in your `terraform.tfvars` file

### Error: "Access denied" or authentication issues
- Run `aws configure` again to set up your credentials
- Make sure your IAM user has administrator permissions

### Error: "Backend initialization required"
- Make sure you ran the bootstrap step first
- Run `terraform init` in the production directory

### Application not loading
- Wait a few minutes after deployment (application is still starting)
- Check the EC2 instance is running in AWS console
- Verify the security groups allow HTTP access

## Managing Your Infrastructure

### View Current Resources
```bash
# See what's deployed
terraform show

# See output values (like URLs)
terraform output
```

### Update Configuration
1. Modify your `terraform.tfvars` file
2. Run `terraform plan` to see changes
3. Run `terraform apply` to apply changes

### Completely Remove Everything
⚠️ **Warning: This will delete everything and cannot be undone!**

```bash
# Destroy all infrastructure
terraform destroy

# Optionally remove state storage
cd ../../bootstrap
terraform destroy
```

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review AWS CloudWatch logs for your EC2 instance
3. Verify your AWS permissions and credentials
4. Make sure all prerequisites are properly installed

## Next Steps

After successful deployment:
1. Access your application using the provided URL
2. Configure your CI/CD pipelines in the dashboard
3. Set up monitoring and alerts as needed
4. Consider setting up a custom domain name for easier access

---
*This guide assumes basic familiarity with command line usage. If you're new to these tools, take time to practice basic commands before proceeding.*
