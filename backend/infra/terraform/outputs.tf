output "compute_reference" {
  description = "Compute layer output reference"
  value       = module.compute.reference
}

output "database_reference" {
  description = "Database layer output reference"
  value       = module.database.reference
}

output "redis_reference" {
  description = "Redis layer output reference"
  value       = module.redis.reference
}

output "object_storage_reference" {
  description = "Object storage layer output reference"
  value       = module.object_storage.reference
}

output "observability_reference" {
  description = "Observability layer output reference"
  value       = module.observability.reference
}
