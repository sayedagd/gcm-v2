terraform {
  required_version = ">= 1.6.0"
}

locals {
  base_tags = merge(var.tags, {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  })
}

module "compute" {
  source = "./modules/compute"

  project_name = var.project_name
  environment  = var.environment
  tags         = local.base_tags
}

module "database" {
  source = "./modules/database"

  project_name = var.project_name
  environment  = var.environment
  tags         = local.base_tags
}

module "redis" {
  source = "./modules/redis"

  project_name = var.project_name
  environment  = var.environment
  tags         = local.base_tags
}

module "object_storage" {
  source = "./modules/object_storage"

  project_name = var.project_name
  environment  = var.environment
  tags         = local.base_tags
}

module "observability" {
  source = "./modules/observability"

  project_name = var.project_name
  environment  = var.environment
  tags         = local.base_tags
}
