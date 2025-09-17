# =============================================================================
# PRODUCTION ENVIRONMENT OUTPUTS
# =============================================================================

# Application Access
output "application_url" {
  description = "URL to access the AutoFlow-AI application"
  value       = "http://${module.networking.alb_dns_name}"
}

output "application_backend_url" {
  description = "URL to access the backend API"
  value       = "http://${module.networking.alb_dns_name}/api"
}

# Load Balancer Information
output "load_balancer_dns" {
  description = "DNS name of the Application Load Balancer"
  value       = module.networking.alb_dns_name
}

output "load_balancer_hosted_zone_id" {
  description = "Hosted zone ID of the Application Load Balancer"
  value       = module.networking.alb_zone_id
}

# EC2 Instance Information
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = module.compute.instance_id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = module.compute.instance_public_ip
}

output "instance_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = module.compute.instance_private_ip
}

# Database Information
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.database_endpoint
}

output "database_name" {
  description = "Database name"
  value       = var.db_name
}

output "database_username" {
  description = "Database username"
  value       = var.db_username
  sensitive   = true
}

# Network Information
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.networking.private_subnet_ids
}

# Security Information
output "ec2_security_group_id" {
  description = "Security group ID for EC2 instances"
  value       = module.networking.ec2_security_group_id
}

output "alb_security_group_id" {
  description = "Security group ID for Application Load Balancer"
  value       = module.networking.alb_security_group_id
}

output "database_security_group_id" {
  description = "Security group ID for RDS database"
  value       = module.networking.database_security_group_id
}

# Session Information
output "session_secret_generated" {
  description = "Whether the session secret was auto-generated"
  value       = var.session_secret == "" ? true : false
  sensitive   = true
}
