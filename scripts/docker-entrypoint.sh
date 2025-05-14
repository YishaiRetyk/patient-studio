#!/usr/bin/env bash
set -e

echo "➡️  AWS profile inside container: $AWS_PROFILE"
aws sts get-caller-identity --query 'Arn' --output text || true

exec "$@"
