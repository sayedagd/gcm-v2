variable "project_name" {
  description = "Project slug used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment name (dev, staging, production)"
  type        = string
}

variable "tags" {
  description = "Global tags/labels applied to all resources"
  type        = map(string)
  default     = {}
}
