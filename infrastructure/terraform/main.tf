terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Backend configuration is provided via backend config file
    # terraform init -backend-config=environments/dev/backend.tfvars
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "patient-studio"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  enable_nat_gateway  = var.enable_nat_gateway
  enable_vpn_gateway  = var.enable_vpn_gateway
}

# Security Module
module "security" {
  source = "./modules/security"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  database_subnets        = module.vpc.database_subnets
  security_group_ids      = [module.security.rds_security_group_id]
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  multi_az                = var.rds_multi_az
  backup_retention_period = var.rds_backup_retention_period
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  private_subnets      = module.vpc.private_subnets
  public_subnets       = module.vpc.public_subnets
  security_group_ids   = [module.security.ecs_security_group_id]
  backend_image        = var.backend_image
  backend_cpu          = var.backend_cpu
  backend_memory       = var.backend_memory
  backend_desired_count = var.backend_desired_count
}

# Reminders Module (SQS + Lambda)
module "reminders" {
  source = "./modules/reminders"

  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnets     = module.vpc.private_subnets
  security_group_ids  = [module.security.lambda_security_group_id]
}
