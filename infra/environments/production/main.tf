# Terraform Configuration for AutoFlow AI Production Environment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }

  # Configure remote state storage
  backend "s3" {
    # Configure these values in backend.tf
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "AutoFlow-AI"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name_prefix = "autoflow-ai-prod"
  common_tags = {
    Project     = "AutoFlow-AI"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Networking module
module "networking" {
  source = "../../modules/networking"
  
  name_prefix         = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
  
  tags = local.common_tags
}

# Database module
module "database" {
  source = "../../modules/database"
  
  name_prefix    = local.name_prefix
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.private_subnet_ids
  security_group_ids = [module.networking.database_security_group_id]
  
  db_instance_class = var.db_instance_class
  db_name          = var.db_name
  db_username      = var.db_username
  db_password      = var.db_password
  
  tags = local.common_tags
}

# Compute module
module "compute" {
  source = "../../modules/compute"
  
  name_prefix    = local.name_prefix
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.public_subnet_ids
  security_group_ids = [module.networking.web_security_group_id]
  
  instance_type = var.instance_type
  key_name      = var.key_name
  
  # Database connection details
  db_endpoint = module.database.db_endpoint
  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password
  
  tags = local.common_tags
}
