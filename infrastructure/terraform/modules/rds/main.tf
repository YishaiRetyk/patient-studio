# RDS PostgreSQL Module with HIPAA-compliant backup configuration
# Per FR-057: 30-day retention, PITR, Multi-AZ

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-patient-studio-db"
  subnet_ids = var.database_subnets

  tags = {
    Name = "${var.environment}-patient-studio-db-subnet-group"
  }
}

resource "aws_db_parameter_group" "postgres16" {
  name   = "${var.environment}-patient-studio-postgres16"
  family = "postgres16"

  # Enable logging for audit trail
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  # Enable auto_explain for query analysis
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
  }

  parameter {
    name  = "auto_explain.log_min_duration"
    value = "1000" # Log queries taking > 1s
  }

  tags = {
    Name = "${var.environment}-patient-studio-postgres16-params"
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.environment}-patient-studio"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "16.4"
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.rds.arn

  # Database configuration
  db_name  = "patient_studio_${var.environment}"
  username = "postgres"
  password = random_password.db_password.result

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  publicly_accessible    = false

  # High availability (per FR-057: Multi-AZ)
  multi_az = var.multi_az

  # Backup configuration (per FR-057: 30-day retention, PITR enabled)
  backup_retention_period   = var.backup_retention_period
  backup_window             = "03:00-04:00"      # UTC
  maintenance_window        = "mon:04:00-mon:05:00" # UTC
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Point-in-time recovery (per FR-057)
  # Enabled automatically when backup_retention_period > 0

  # Deletion protection for production
  deletion_protection = var.environment == "prod" ? true : false
  skip_final_snapshot = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment != "dev" ? "${var.environment}-patient-studio-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Performance Insights for monitoring
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id = aws_kms_key.rds.arn

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgres16.name

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Copy tags to snapshots
  copy_tags_to_snapshot = true

  tags = {
    Name            = "${var.environment}-patient-studio-db"
    BackupRetention = "${var.backup_retention_period} days"
    PITR            = "enabled"
    MultiAZ         = var.multi_az ? "enabled" : "disabled"
  }
}

# KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "${var.environment} Patient Studio RDS encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "${var.environment}-patient-studio-rds-key"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.environment}-patient-studio-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.environment}/patient-studio/db-password"

  tags = {
    Name = "${var.environment}-patient-studio-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-patient-studio-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch alarms for backup failures
resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  alarm_name          = "${var.environment}-patient-studio-rds-backup-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupRetentionPeriodStorageUsed"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Alert when RDS backup fails"
  treat_missing_data  = "breaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}
