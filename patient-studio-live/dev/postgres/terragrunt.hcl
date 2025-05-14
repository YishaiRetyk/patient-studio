include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../patient-studio-infra/modules/postgres"
}

remote_state {
  backend = "s3"
  config = {
    profile        = "patient-studio-dev"              # <-- Set your AWS CLI profile
    region         = "il-central-1"
    bucket         = "patient-scheduler-tfstate"
    key            = "dev/postgres/terraform.tfstate"
    dynamodb_table = "tf-lock-table"
    encrypt        = true
  }
}

inputs = {
  identifier     = "scheduler-db-dev"
  instance_class = "db.t3.micro"
  storage        = 20
  username       = "devuser"
  password       = "devpassword123"
  db_name        = "scheduler"
}
