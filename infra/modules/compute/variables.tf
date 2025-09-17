# =============================================================================
# COMPUTE MODULE VARIABLES
# =============================================================================
# Variables for the compute module including EC2 instance configuration,
# networking, and application settings.

variable "project_name" {
  description = "Name of the project"
  type        = string

  validation {
    condition     = length(var.project_name) > 0 && length(var.project_name) <= 30
    error_message = "Project name must be between 1 and 30 characters."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "vpc_id" {
  description = "VPC ID where the EC2 instance will be created"
  type        = string

  validation {
    condition     = length(var.vpc_id) > 0
    error_message = "VPC ID cannot be empty."
  }
}

variable "subnet_id" {
  description = "Subnet ID where the EC2 instance will be created"
  type        = string

  validation {
    condition     = length(var.subnet_id) > 0
    error_message = "Subnet ID cannot be empty."
  }
}

variable "security_group_id" {
  description = "Security group ID for the EC2 instance"
  type        = string

  validation {
    condition     = length(var.security_group_id) > 0
    error_message = "Security group ID cannot be empty."
  }
}

variable "alb_target_group_frontend_arn" {
  description = "ARN of the ALB target group for frontend"
  type        = string

  validation {
    condition     = length(var.alb_target_group_frontend_arn) > 0
    error_message = "Frontend target group ARN cannot be empty."
  }
}

variable "alb_target_group_backend_arn" {
  description = "ARN of the ALB target group for backend"
  type        = string

  validation {
    condition     = length(var.alb_target_group_backend_arn) > 0
    error_message = "Backend target group ARN cannot be empty."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"

  validation {
    condition = contains([
      "t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge",
      "t3a.micro", "t3a.small", "t3a.medium", "t3a.large", "t3a.xlarge"
    ], var.instance_type)
    error_message = "Instance type must be a valid t3 or t3a instance type."
  }
}

variable "key_pair_name" {
  description = "AWS key pair name for EC2 instance access"
  type        = string

  validation {
    condition     = length(var.key_pair_name) > 0
    error_message = "Key pair name cannot be empty."
  }
}

variable "associate_public_ip" {
  description = "Whether to associate a public IP address with the instance"
  type        = bool
  default     = true
}

variable "root_volume_type" {
  description = "Type of root EBS volume"
  type        = string
  default     = "gp3"

  validation {
    condition     = contains(["gp2", "gp3", "io1", "io2"], var.root_volume_type)
    error_message = "Root volume type must be one of: gp2, gp3, io1, io2."
  }
}

variable "root_volume_size" {
  description = "Size of the root EBS volume in GB"
  type        = number
  default     = 20

  validation {
    condition     = var.root_volume_size >= 8 && var.root_volume_size <= 100
    error_message = "Root volume size must be between 8 and 100 GB."
  }
}

variable "database_url" {
  description = "PostgreSQL database connection URL"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^postgresql://", var.database_url))
    error_message = "Database URL must be a valid PostgreSQL connection string."
  }
}

variable "session_secret" {
  description = "Secret key for session management"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.session_secret) >= 16
    error_message = "Session secret must be at least 16 characters long."
  }
}

variable "react_app_api_url" {
  description = "API URL for the React frontend"
  type        = string

  validation {
    condition     = can(regex("^https?://", var.react_app_api_url))
    error_message = "React App API URL must be a valid HTTP/HTTPS URL."
  }
}
