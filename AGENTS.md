# Agent Instructions

## Post-Feature Testing

After completing any feature or fix, the agent MUST:

1. Run `pnpm start` to verify there are no errors
2. If there are errors, fix them immediately
3. Re-run `pnpm start` until all errors are resolved
4. Only then consider the task complete

This ensures the codebase remains in a working state at all times.
