# Agent Instructions

## Post-Feature Testing

After completing any feature or fix, the agent MUST:

1. Run `pnpm test` to verify all unit tests pass (59 tests across 11 suites)
2. If any test fails, fix the issue immediately
3. Re-run `pnpm test` until all tests pass
4. Run `pnpm start` to verify there are no runtime errors
5. If there are errors, fix them immediately
6. Re-run `pnpm start` until all errors are resolved
7. Only then consider the task complete

This ensures the codebase remains in a working state at all times.

## Real-World npm Verification (MANDATORY for every fix/feature)

**Never trust local-only testing.** `pnpm start` runs from the repo and won't catch missing files in the published package. Always run the full npm verification:

1. Bump version in `package.json` (e.g. `0.1.14` → `0.1.15`)
2. Commit and push to `main` — GitHub Actions auto-publishes to npm
3. Wait for the new version to appear on npm:
   ```bash
   # Poll until npm has the new version
   for i in $(seq 1 30); do sleep 10; v=$(npm view free-coding-models version 2>/dev/null); echo "Attempt $i: npm version = $v"; if [ "$v" = "NEW_VERSION" ]; then echo "✅ published!"; break; fi; done
   ```
4. Install the published version globally:
   ```bash
   npm install -g free-coding-models@NEW_VERSION
   ```
5. Run the global binary and verify it works:
   ```bash
   free-coding-models
   ```
6. Only if the global npm-installed version works → the fix is confirmed

**Why:** A local `npm install -g .` can mask issues because it symlinks the repo. The real npm package is a tarball built from the `files` field — if something is missing there, only a real npm install will catch it.

## Test Architecture

- Tests live in `test/test.js` using Node.js built-in `node:test` + `node:assert` (zero deps)
- Pure logic functions are in `lib/utils.js` (extracted from the main CLI for testability)
- The main CLI (`bin/free-coding-models.js`) imports from `lib/utils.js`
- If you add new pure logic (calculations, parsing, filtering), add it to `lib/utils.js` and write tests
- If you modify existing logic in `lib/utils.js`, update the corresponding tests

### What's tested:
- **sources.js data integrity** — model structure, valid tiers, no duplicates, count consistency
- **Core logic** — getAvg, getVerdict, getUptime, filterByTier, sortResults, findBestModel
- **CLI arg parsing** — all flags (--best, --fiable, --opencode, --openclaw, --tier)
- **Package sanity** — package.json fields, bin entry exists, shebang, ESM imports

## Changelog

After every dev session (feature, fix, refactor), add a succinct entry to `CHANGELOG.md`:

- Use the current version from `package.json`
- Add under the matching version header (or create a new one if the version was bumped)
- List changes under `### Added`, `### Fixed`, or `### Changed` as appropriate
- Keep entries short — one line per change is enough
