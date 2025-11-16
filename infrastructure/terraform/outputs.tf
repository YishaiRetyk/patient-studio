output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.database_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "backend_load_balancer_dns" {
  description = "Backend load balancer DNS name"
  value       = module.ecs.load_balancer_dns
}

output "reminder_queue_url" {
  description = "SQS queue URL for appointment reminders"
  value       = module.reminders.queue_url
}

output "reminder_lambda_function_name" {
  description = "Lambda function name for reminder processing"
  value       = module.reminders.lambda_function_name
}
