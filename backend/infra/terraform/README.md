# Infrastructure Baseline (Terraform)

## Goal

Provide a repository-tracked baseline Infrastructure as Code skeleton for critical platform resources:

- compute runtime
- managed database
- managed redis
- backup object storage
- observability workspace

## Structure

- main.tf: provider and module wiring
- variables.tf: environment and naming contract
- outputs.tf: baseline outputs for integration wiring
- modules/*: module placeholders for each critical resource domain

## Usage

1. Copy terraform.tfvars.example to terraform.tfvars.
2. Set environment-specific values.
3. Run terraform init.
4. Run terraform plan for target environment.
5. Attach plan output to release/change review.

## Notes

- This baseline is intentionally provider-agnostic at module boundaries.
- Module internals are placeholders and should be replaced by production-ready modules per platform standards.
- Any resource onboarding must update this baseline and environment inventory in the same pull request.
