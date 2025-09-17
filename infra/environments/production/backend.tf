terraform {
  backend "s3" {
    bucket         = "autoflow-ai-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "autoflow-ai-terraform-locks"
  }
}
