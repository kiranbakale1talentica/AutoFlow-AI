# =============================================================================
# AUTOFLOW-AI PRODUCTION ENVIRONMENT CONFIGURATION
# =============================================================================
# This configuration orchestrates all infrastructure modules for the 
# AutoFlow-AI CI/CD Pipeline Health Dashboard production deployment.
# Architecture: Simplified, cost-effective single EC2 instance with ALB and RDS

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps Team"
    }
  }
}

# Data sources for dynamic values
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random password generation for database
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Generate session secret if not provided
resource "random_password" "session_secret" {
  count   = var.session_secret == "" ? 1 : 0
  length  = 32
  special = false
}

# Local values for consistent naming and configuration
locals {
  # Use provided session secret or generate new one
  session_secret = var.session_secret != "" ? var.session_secret : random_password.session_secret[0].result
  
  # Common tags applied to all resources
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = "DevOps Team"
  }
}

# =============================================================================
# NETWORKING MODULE
# =============================================================================
module "networking" {
  source = "../../modules/networking"

  # Project identification
  project_name = var.project_name
  environment  = var.environment

  # Network configuration
  vpc_cidr               = var.vpc_cidr
  public_subnet_cidrs    = var.public_subnet_cidrs
  private_subnet_cidrs   = var.private_subnet_cidrs
  allowed_ssh_cidrs      = var.allowed_ssh_cidrs
}

# =============================================================================
# DATABASE MODULE  
# =============================================================================
module "database" {
  source = "../../modules/database"

  # Project identification
  project_name = var.project_name
  environment  = var.environment

  # Network configuration
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  database_security_group_id = module.networking.database_security_group_id

  # Database configuration
  db_name                = var.db_name
  db_username            = var.db_username
  db_password            = random_password.db_password.result
  postgres_version       = var.postgres_version
  db_instance_class      = var.db_instance_class
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  multi_az               = var.multi_az
  backup_retention_period = var.backup_retention_period

  # Enable deletion protection for production
  deletion_protection = var.environment == "prod" ? true : false
}

# =============================================================================
# COMPUTE MODULE
# =============================================================================
module "compute" {
  source = "../../modules/compute"

  # Project identification
  project_name = var.project_name
  environment  = var.environment

  # Network configuration - Single instance setup
  vpc_id            = module.networking.vpc_id
  subnet_id         = module.networking.public_subnet_ids[0]  # Use first public subnet
  security_group_id = module.networking.ec2_security_group_id
  
  # ALB target group attachments
  alb_target_group_frontend_arn = module.networking.alb_target_group_frontend_arn
  alb_target_group_backend_arn  = module.networking.alb_target_group_backend_arn

  # Instance configuration
  instance_type         = var.instance_type
  key_pair_name        = var.key_pair_name
  associate_public_ip  = true
  root_volume_type     = "gp3"
  root_volume_size     = var.root_volume_size

  # Application configuration
  database_url      = "postgresql://${var.db_username}:${random_password.db_password.result}@${module.database.database_endpoint}:5432/${var.db_name}"
  session_secret    = local.session_secret
  react_app_api_url = "http://${module.networking.alb_dns_name}"
}
