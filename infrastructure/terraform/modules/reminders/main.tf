# SQS + Lambda for Appointment Reminders (T078)
# Per FR-015: 48h and 2h email reminders

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnets" {
  description = "Private subnet IDs for Lambda"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for Lambda"
  type        = list(string)
}

# SQS Queue for reminder messages
resource "aws_sqs_queue" "reminders" {
  name                       = "${var.environment}-patient-studio-reminders"
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KB
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 10      # Long polling
  visibility_timeout_seconds = 300     # 5 minutes (Lambda execution time)

  # Dead letter queue for failed messages
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.reminders_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.environment}-patient-studio-reminders"
  }
}

# Dead Letter Queue
resource "aws_sqs_queue" "reminders_dlq" {
  name                      = "${var.environment}-patient-studio-reminders-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.environment}-patient-studio-reminders-dlq"
  }
}

# IAM role for Lambda execution
resource "aws_iam_role" "reminders_lambda" {
  name = "${var.environment}-patient-studio-reminders-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for Lambda
resource "aws_iam_role_policy" "reminders_lambda" {
  name = "${var.environment}-patient-studio-reminders-lambda"
  role = aws_iam_role.reminders_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.reminders.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "reminder_processor" {
  filename         = "${path.module}/../../../lambda/appointment-reminders/deployment.zip"
  function_name    = "${var.environment}-patient-studio-reminder-processor"
  role             = aws_iam_role.reminders_lambda.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/../../../lambda/appointment-reminders/deployment.zip")
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      SENDGRID_API_KEY   = var.sendgrid_api_key
      SENDGRID_FROM_EMAIL = var.sendgrid_from_email
      SENDGRID_FROM_NAME  = var.sendgrid_from_name
      NODE_ENV            = var.environment
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnets
    security_group_ids = var.security_group_ids
  }

  tags = {
    Name = "${var.environment}-patient-studio-reminder-processor"
  }
}

# Event source mapping: SQS -> Lambda
resource "aws_lambda_event_source_mapping" "reminders" {
  event_source_arn = aws_sqs_queue.reminders.arn
  function_name    = aws_lambda_function.reminder_processor.arn
  batch_size       = 10
  enabled          = true

  # Process messages as they arrive
  maximum_batching_window_in_seconds = 0
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "reminder_processor" {
  name              = "/aws/lambda/${aws_lambda_function.reminder_processor.function_name}"
  retention_in_days = 30

  tags = {
    Name = "${var.environment}-patient-studio-reminder-processor-logs"
  }
}

# Variables for SendGrid configuration
variable "sendgrid_api_key" {
  description = "SendGrid API key"
  type        = string
  sensitive   = true
}

variable "sendgrid_from_email" {
  description = "SendGrid from email"
  type        = string
  default     = "noreply@patient-studio.com"
}

variable "sendgrid_from_name" {
  description = "SendGrid from name"
  type        = string
  default     = "Patient Studio"
}

# Outputs
output "queue_url" {
  description = "SQS queue URL for reminder messages"
  value       = aws_sqs_queue.reminders.url
}

output "queue_arn" {
  description = "SQS queue ARN"
  value       = aws_sqs_queue.reminders.arn
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.reminder_processor.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.reminder_processor.arn
}
