# Security Policy

## Supported versions

Security fixes are released for the latest published version only.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through [GitHub private vulnerability reporting](https://github.com/kyletaylored/datadog-rum-interceptor/security/advisories/new).

Include a description of the issue, steps to reproduce, and the affected version. You should receive a response within 7 days.

## Verifying releases

Every release is built once in GitHub Actions and published with provenance, so you can verify that a package came from this repository:

```bash
# Verify npm registry signatures and provenance for installed packages
npm audit signatures

# Verify a tarball downloaded from a GitHub release
gh attestation verify kyletaylored-datadog-rum-interceptor-<version>.tgz --repo kyletaylored/datadog-rum-interceptor
sha256sum --check SHA256SUMS
```
