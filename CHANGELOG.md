# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version is below 1.0.0, minor releases may include breaking changes.
Versions 0.0.1 through 0.0.7 were tagged in git but not published to the npm registry.

Add entries for upcoming changes under **Unreleased**, grouped as `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`. `npm run release:prepare` moves them into a dated version section (see [Releasing](README.md#releasing)).

## [Unreleased]

## [0.1.0] - 2026-10-26

### Added

- `redactHeaders` option to customize the redacted header list. Pass `[]` to disable redaction.
- Test suite (Vitest) and CI workflow.
- Release workflow: each version is built once, checked to be byte-for-byte reproducible, published to npm with provenance, and attached to a GitHub release with a SHA-256 checksum and build attestation.

### Changed

- **Breaking:** sensitive headers are redacted by default. To restore the previous behavior, use `init({ redactHeaders: [] })`.
- `stop()` now also clears all stored request/response data.
- Datadog traffic is now detected by hostname. Requests to EU (`datadoghq.eu`) and US1-FED (`ddog-gov.com`) intake are now ignored, and unrelated URLs that merely contain `datadoghq.com` are no longer skipped.
- The CommonJS build is now `dist/cjs/index.cjs`. Consumers resolving the package through `exports` (`require('@kyletaylored/datadog-rum-interceptor')`) are unaffected.

### Removed

- The unused `@rollup/rollup-linux-x64-gnu` optional dependency.

### Fixed

- `require()` of the package failed because the CJS build was treated as an ES module.
- `getPayload` threw when a fetch event had no `context.response` or an XHR event had no `context.xhr` (for example, on network errors). It now returns `null`.

### Security

- Upgraded Vite 6.0 → 8.3. Resolves build-time advisories in esbuild, rollup, postcss, nanoid, and source-map-js. The published runtime code was not affected.
- Sensitive headers (`authorization`, `proxy-authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `x-csrf-token`, `x-xsrf-token`) are now redacted as `[REDACTED]` before payloads are stored.
- Payloads that are never claimed by `getPayload` now expire after 30 seconds instead of staying in memory for the life of the page.

## [0.0.9] - 2025-02-04

### Removed

- The legacy `main`, `module`, and `browser` fields in `package.json`. Entry points are resolved through `exports` only.

## [0.0.8] - 2025-01-31

### Changed

- **Breaking:** the entry point now has a default export, `{ init }`, instead of a named `init` export. Use `import datadogRumInterceptor from '@kyletaylored/datadog-rum-interceptor'`.
- Build output files were renamed from `main.js` to `index.js`.
- The ES and CommonJS builds no longer bundle `@mswjs/interceptors`; it is installed as a dependency. The UMD build still bundles it for direct use in the browser.

## [0.0.7] - 2025-01-29

### Changed

- A single entry point with Fetch and XHR interceptors is used in all environments.
- Internal modules use ES module imports.

### Removed

- The separate Node.js entry point (which used `ClientRequestInterceptor`).

## [0.0.6] - 2025-01-29

### Fixed

- Fingerprint matching between intercepted responses and Datadog RUM events, including XHR response headers.

## [0.0.5] - 2025-01-29

### Changed

- **Breaking:** renamed `extractResourceData` to `getPayload`.

## [0.0.4] - 2025-01-29

### Changed

- **Breaking:** reworked how payloads are delivered. Payloads are stored by Datadog trace ID or a request fingerprint and retrieved from RUM's `beforeSend` callback, instead of being sent to Datadog Logs or RUM directly.

### Removed

- The `excludeUrls`, `mask`, `beforeLog`, `datadogLogs`, and `datadogRum` options.

## [0.0.3] - 2025-01-27

### Added

- `excludeUrls`, `mask`, `beforeLog`, `datadogLogs`, `datadogRum`, and `debug` options.
- Request and response body parsing and masking.

### Changed

- Requests to `datadoghq.com` are excluded automatically.

## [0.0.2] - 2025-01-24

### Fixed

- README and browser build configuration.

## [0.0.1] - 2025-01-24

### Added

- Initial release: intercepts Fetch and XHR requests with `@mswjs/interceptors` and reports request/response details to Datadog.

[Unreleased]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.1.0...HEAD
[0.1.0]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.9...0.1.0
[0.0.9]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.8...0.0.9
[0.0.8]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.7...0.0.8
[0.0.7]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.6...0.0.7
[0.0.6]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.5...0.0.6
[0.0.5]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.4...0.0.5
[0.0.4]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.3...0.0.4
[0.0.3]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.2...0.0.3
[0.0.2]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.1...0.0.2
[0.0.1]: https://github.com/kyletaylored/datadog-rum-interceptor/releases/tag/0.0.1
