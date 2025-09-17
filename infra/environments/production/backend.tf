terraform {
  backend "s3" {
    bucket  = "autoflow-ai-terraform-state"
    key     = "production/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    
    # Using S3's built-in locking instead of DynamoDB
    # Note: S3 bucket should have versioning enabled and object lock configured
    # No dynamodb_table needed - S3 handles state locking natively when properly configured
  }
}
