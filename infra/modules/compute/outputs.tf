output "web_url" {
  description = "Application URL"
  value       = "http://${aws_lb.main.dns_name}"
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = aws_lb.main.dns_name
}
