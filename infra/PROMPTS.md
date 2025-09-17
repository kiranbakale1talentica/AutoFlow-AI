# AutoFlow-AI Infrastructure Prompts

## Standard Deployment Prompts

### Prompt 1: Bootstrap Infrastructure
```
I need to set up Terraform state storage for AutoFlow-AI project. Create an S3 bucket with versioning and object locking enabled for state management. Include proper encryption and access controls.
```

**Expected Output:**
- S3 bucket with versioning
- Object locking configuration
- Encryption at rest
- IAM policies for access control

### Prompt 2: Create Networking Module
```
Create a Terraform networking module for AutoFlow-AI with:
- VPC with CIDR 10.0.0.0/16
- 2 public subnets and 2 private subnets across different AZs
- Application Load Balancer in public subnets
- Security groups for ALB, EC2, and RDS with least privilege access
- NAT Gateway for private subnet internet access
```

**Expected Output:**
- VPC with proper subnet configuration
- ALB with target groups for frontend (3000) and backend (5000)
- Security groups with specific port access
- Outputs for other modules to consume

### Prompt 3: Create Database Module
```
Create a Terraform RDS module for AutoFlow-AI with:
- PostgreSQL engine (latest stable version)
- Single AZ deployment for cost optimization
- Deployed in private subnets
- Automated backups with 7-day retention
- Encryption at rest enabled
- Parameter group optimized for small workloads
```

**Expected Output:**
- RDS PostgreSQL instance
- DB subnet group in private subnets
- Security group allowing access from EC2 only
- Outputs including endpoint and connection details

### Prompt 4: Create Compute Module
```
Create a Terraform compute module for AutoFlow-AI with:
- Single EC2 instance (no auto-scaling)
- User data script for application deployment
- IAM role with CloudWatch logging permissions
- Automatic registration with ALB target groups
- Support for SSH access via key pair
```

**Expected Output:**
- EC2 instance with application setup
- IAM instance profile with necessary permissions
- User data script for Node.js application deployment
- ALB target group attachments

### Prompt 5: Create User Data Script
```
Create a bash user data script for Amazon Linux 2 that:
- Installs Node.js 18.x and npm
- Clones AutoFlow-AI repository from GitHub
- Sets up environment variables for database connection
- Installs and configures PM2 for process management
- Sets up both frontend and backend applications
- Configures health checks and monitoring
```

**Expected Output:**
- Complete bash script for application setup
- PM2 ecosystem configuration
- Health check scripts
- Log rotation setup

### Prompt 6: Production Environment Configuration
```
Create a production Terraform configuration that orchestrates all modules:
- Uses remote S3 backend for state
- Defines all required variables with validation
- Calls networking, database, and compute modules
- Generates database password securely
- Provides all necessary outputs for accessing the application
```

**Expected Output:**
- Complete production environment setup
- Variable definitions with validation
- Module integration
- Secure password generation
- Output values for application access

### Prompt 7: Validation and Testing
```
Create validation commands and procedures to:
- Validate Terraform configuration syntax
- Check security best practices
- Verify module interfaces match
- Test deployment in stages
- Verify application functionality post-deployment
```

**Expected Output:**
- terraform validate commands
- Security scanning procedures
- Module interface verification
- Deployment testing steps

## Infrastructure Architecture Prompts

### Network Security Prompt
```
Design security groups for a 3-tier web application:
- ALB should accept HTTP/HTTPS from internet
- EC2 should accept traffic only from ALB on ports 3000 and 5000
- RDS should accept PostgreSQL traffic only from EC2
- SSH access should be restricted to specific IP ranges
```

### State Management Prompt
```
Configure Terraform state management with:
- S3 bucket with versioning for state storage
- Object locking instead of DynamoDB for concurrent access
- Encryption in transit and at rest
- Proper IAM policies for team access
```

### Cost Optimization Prompt
```
Design infrastructure for cost optimization:
- Use appropriate instance sizes for workload
- Single AZ deployment where acceptable
- GP3 storage instead of GP2
- Reserved instances for predictable workloads
```

## Troubleshooting Prompts

### Debug Module Issues
```
When Terraform modules fail validation:
1. Check module variable names match exactly
2. Verify output names are correct
3. Ensure required variables are provided
4. Check for circular dependencies
```

### Fix Template Issues
```
When templatefile function fails:
1. Escape special characters (% becomes %%)
2. Check file path is correct relative to module
3. Verify all template variables are provided
4. Test template syntax separately
```

### Resolve Backend Issues
```
When backend initialization fails:
1. Ensure S3 bucket exists and is accessible
2. Check AWS credentials and permissions
3. Verify bucket region matches configuration
4. Confirm object locking is properly configured
```

## Deployment Commands

### Quick Deploy
```bash
# Bootstrap (first time only)
cd infra/bootstrap && terraform init && terraform apply

# Deploy infrastructure
cd ../environments/production
terraform init
terraform plan -var="key_pair_name=YOUR_KEY"
terraform apply -var="key_pair_name=YOUR_KEY"
```

### Validation
```bash
terraform validate
terraform fmt -recursive
terraform plan
```

### Cleanup
```bash
terraform destroy -var="key_pair_name=YOUR_KEY"
cd ../../bootstrap && terraform destroy
```
