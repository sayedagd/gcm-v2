# Feature Folder Convention

Each feature under src/features must follow this folder contract:

- ui
- hooks
- api
- model
- tests

Notes:
- Keep route files thin by importing feature modules.
- Prefer feature-local models/types over global coupling.
- Keep API operation wrappers in feature api folders and reference shared endpoint constants.
