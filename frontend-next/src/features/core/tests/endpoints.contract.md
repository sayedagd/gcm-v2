# Endpoint Contract Notes

- Central endpoint constants are defined in `src/features/core/model/endpoints.ts`.
- Route modules should reference endpoint constants through feature API operation wrappers.
- Avoid embedding raw `/api/v1/...` literals in feature UI files.
