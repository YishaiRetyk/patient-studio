variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "database_subnets" {
  description = "List of subnet IDs for database"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment (per FR-057)"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Backup retention period in days (per FR-057: 30 days for HIPAA compliance)"
  type        = number
  default     = 30
}
