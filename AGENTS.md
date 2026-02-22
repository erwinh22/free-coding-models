# Agent Instructions

## Post-Feature Testing

After completing any feature or fix, the agent MUST:

1. Run `pnpm start` to verify there are no errors
2. If there are errors, fix them immediately
3. Re-run `pnpm start` until all errors are resolved
4. Only then consider the task complete

This ensures the codebase remains in a working state at all times.

## Changelog

After every dev session (feature, fix, refactor), add a succinct entry to `CHANGELOG.md`:

- Use the current version from `package.json`
- Add under the matching version header (or create a new one if the version was bumped)
- List changes under `### Added`, `### Fixed`, or `### Changed` as appropriate
- Keep entries short — one line per change is enough
