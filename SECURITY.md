# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Hyperweaver UI, please report it responsibly:

### Preferred Method: Security Advisory

1. Go to the [GitHub Security Advisory page](https://github.com/Makr91/hyperweaver-ui/security/advisories)
2. Click "Report a vulnerability"
3. Fill out the advisory form with detailed information
4. Submit the advisory

### What to Include

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Affected versions** (if known)
- **Suggested fix** (if you have one)

## Response Process

Due to limited development resources, please understand that:

- **Initial Response**: we aim to acknowledge receipt within 48–72 hours
- **Assessment**: initial assessment within about a week
- **Resolution**: timeline depends on severity, typically 1–4 weeks
- **Disclosure**: coordinated disclosure after a fix is available

### Severity Levels

- **Critical**: immediate attention (e.g. XSS enabling account takeover)
- **High**: quick response (authentication / session handling flaws)
- **Medium**: standard timeline
- **Low**: lower priority

## Focus Areas for a Browser SPA

Hyperweaver UI is a client-side app that talks to a backend over a relative `/api` surface. The security-relevant areas are:

- **Cross-site scripting (XSS)** — unsafe rendering of untrusted data. React escapes by default, and `dangerouslySetInnerHTML` is disallowed by lint (`react/no-danger`).
- **Auth / session handling** — sessions use same-origin, credentialed requests; watch for token or session leakage into logs, storage, or third parties.
- **Dependency & supply chain** — vulnerable npm packages. Dependabot and CodeQL run against this repository.
- **Content injection** — data rendered from the API (names, logs, config values) must not be able to break out of its context.

## Best Practices for Operators

1. **Keep updated** — always run the latest stable release
2. **Serve over HTTPS** with appropriate security headers (e.g. a Content Security Policy)
3. **Keep dependencies patched**

## Acknowledgments

We appreciate the security research community's efforts. Responsible disclosure helps protect all users.

### Hall of Fame

Contributors who responsibly report security vulnerabilities will be acknowledged here (with their permission):

- _No vulnerabilities reported yet_

## Updates to This Policy

This security policy may be updated as the project evolves. Check back periodically for changes.
