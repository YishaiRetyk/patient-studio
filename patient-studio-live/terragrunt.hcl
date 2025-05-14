remote_state {
  backend = "s3"
  config = {
    bucket         = "patient-scheduler-tfstate"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    dynamodb_table = "tf-lock-table"
    region         = "us-east-1"
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "us-east-1"
}
EOF
}
