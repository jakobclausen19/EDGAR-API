# Project instructions

Follow the [project brief](docs/project.md) for the stack and module boundaries. Keep agent and AI Markdown files under `docs/`, with this root file as the entry point.

Record any project or API design decision made without explicit user direction in [the decision log](docs/improvments.md), including the chosen default and its rationale.

## Adding npm packages

Apply these steps to runtime and development dependencies.

1. Before adding a package, check its published versions in the npm registry. Verify that the chosen version is stable and compatible with the project's Node.js LTS release and peer dependencies.
2. In a temporary copy of the project's npm manifests, resolve the proposed change into a candidate lockfile. Run `npm audit` on the full candidate dependency tree, including development dependencies, before applying the change to the project.
3. Report each proposed package and version, the stable-version check and the audit result. Report a pass when the audit completes with zero known vulnerabilities. Report a failure with severity counts when it finds vulnerabilities. If verification or the audit cannot complete, report the error and identify the outstanding check.
4. After applying a passing change, verify the resulting project lockfile with `npm audit` and report the final outcome.

<!-- postman-cli:installation:start -->
Postman CLI is installed on this device, and can be used for API Engineering work.
<!-- postman-cli:installation:end -->
