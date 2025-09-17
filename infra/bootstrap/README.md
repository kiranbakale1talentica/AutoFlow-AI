# Terraform State Storage Bootstrap

This directory contains the Terraform configuration to set up the S3 bucket for storing Terraform state files with proper versioning and object locking enabled.

## Purpose

This bootstrap configuration creates:
- S3 bucket for Terraform state storage
- Versioning enabled for state history
- Server-side encryption for security
- Object locking for state locking (replaces DynamoDB)
- Public access blocking for security
- Bucket policy to enforce secure transport

## Usage

### 1. Initial Setup (One-time)

Run this configuration first to create the state storage infrastructure:

```bash
# Navigate to bootstrap directory
cd infra/bootstrap

# Initialize Terraform
terraform init

# Plan the changes
terraform plan

# Apply the configuration
terraform apply
```

### 2. Use the State Bucket

After running the bootstrap, update your main Terraform configurations to use the created S3 bucket for remote state storage.

The backend configuration should look like:

```hcl
terraform {
  backend "s3" {
    bucket  = "autoflow-ai-terraform-state"
    key     = "production/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
```

## Benefits of S3 Object Locking vs DynamoDB

1. **Cost Effective**: No additional DynamoDB table charges
2. **Simplified Architecture**: One less service to manage
3. **Built-in Integration**: S3 object locking is natively supported by Terraform
4. **Automatic Cleanup**: Lock automatically expires after operation
5. **Compliance**: Object locking provides additional compliance features

## State Locking Behavior

- Terraform automatically acquires locks when performing operations
- Locks are released automatically when operations complete
- Failed operations will automatically release locks after timeout
- Object locking ensures state consistency across team members

## Security Features

- Encryption at rest using AES256
- Public access completely blocked
- HTTPS-only access enforced
- Versioning enabled for state recovery

## Important Notes

1. **Run Bootstrap First**: Always run this bootstrap configuration before using the main infrastructure code
2. **One-time Setup**: This only needs to be run once per AWS account/region
3. **State Storage**: This bootstrap configuration itself uses local state (since it creates the remote state storage)
4. **Backup**: The S3 bucket has versioning enabled, providing automatic state backups
