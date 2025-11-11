variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# VPC Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN gateway"
  type        = bool
  default     = false
}

# RDS Variables
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days (per FR-057)"
  type        = number
  default     = 30
}

# ECS Variables
variable "backend_image" {
  description = "Docker image for backend"
  type        = string
}

variable "backend_cpu" {
  description = "CPU units for backend container"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memory for backend container in MB"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend containers"
  type        = number
  default     = 2
}
