resource "aws_db_instance" "postgres" {
  identifier         = var.identifier
  engine             = "postgres"
  engine_version     = "15.3"
  instance_class     = var.instance_class
  allocated_storage  = var.storage
  username           = var.username
  password           = var.password
  db_name            = var.db_name
  publicly_accessible = false
  skip_final_snapshot = true
}
