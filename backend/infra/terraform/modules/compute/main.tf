variable "project_name" { type = string }
variable "environment" { type = string }
variable "tags" { type = map(string) }

output "reference" {
  value = "compute/${var.project_name}/${var.environment}"
}
