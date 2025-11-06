# CloudWatch Cost Monitoring Alarms (T049)
# Per FR-055: Cost alerts at 80% and 100% thresholds

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly budget in USD"
  type        = number
  default     = 1000
}

variable "alert_email" {
  description = "Email address for budget alerts"
  type        = string
}

# SNS Topic for cost alerts
resource "aws_sns_topic" "cost_alerts" {
  name = "${var.environment}-patient-studio-cost-alerts"

  tags = {
    Name = "${var.environment}-patient-studio-cost-alerts"
  }
}

resource "aws_sns_topic_subscription" "cost_alert_email" {
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Budget for cost monitoring
resource "aws_budgets_budget" "monthly" {
  name              = "${var.environment}-patient-studio-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_usd
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-01-01_00:00"

  # 80% threshold alert (per FR-055)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }

  # 100% threshold alert (per FR-055)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  cost_filters = {
    TagKeyValue = "user:Project$patient-studio"
  }
}

# CloudWatch metric alarm for estimated charges
resource "aws_cloudwatch_metric_alarm" "estimated_charges_80" {
  alarm_name          = "${var.environment}-patient-studio-estimated-charges-80pct"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "21600" # 6 hours
  statistic           = "Maximum"
  threshold           = var.monthly_budget_usd * 0.8
  alarm_description   = "Alert when estimated charges reach 80% of monthly budget"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

resource "aws_cloudwatch_metric_alarm" "estimated_charges_100" {
  alarm_name          = "${var.environment}-patient-studio-estimated-charges-100pct"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "21600" # 6 hours
  statistic           = "Maximum"
  threshold           = var.monthly_budget_usd
  alarm_description   = "Alert when estimated charges reach 100% of monthly budget"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

output "cost_alert_topic_arn" {
  description = "ARN of SNS topic for cost alerts"
  value       = aws_sns_topic.cost_alerts.arn
}
