output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

output "web_url" {
  description = "Application URL"
  value       = module.compute.web_url
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.database.db_endpoint
  sensitive   = true
}
