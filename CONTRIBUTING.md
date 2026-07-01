# Contributing to Hyperweaver UI

Thank you for your interest in contributing to Hyperweaver UI! Community contributions are essential to the project's continued growth.

## Important Note on Resources

Hyperweaver UI is maintained with limited development resources. **Community contributions directly impact the pace of feature development and bug fixes.**

## How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the appropriate issue template** (bug report, feature request, etc.)
3. **Provide detailed information** — steps to reproduce, expected vs. actual behavior
4. **Include environment details** (browser + version, OS, Node.js version)

### Submitting Pull Requests

1. **Fork the repository** and create your feature branch from `main`
2. **Follow the existing code style** — ESLint + Prettier enforce it (`npm run lint`)
3. **Keep changes focused** and write clear commit messages using [Conventional Commits](https://www.conventionalcommits.org/) (release-please relies on them)
4. **Fill out the pull request template** completely

### Development Setup

1. Clone your fork of the repository
2. Install dependencies: `npm install`
3. Point the dev proxy at a backend in `config.yaml` (`server.api_target`)
4. Start the dev server: `npm run dev`, then open [localhost:3000](http://localhost:3000)

### Code Style Guidelines

- Follow existing React / JavaScript conventions
- **ESLint** (strict React + hooks + jsx-a11y + import rules) and **Prettier** enforce style — run `npm run lint` / `npm run lint:fix`
- Use meaningful names, keep components focused, and prefer Bootstrap utilities/components over ad-hoc CSS

### What We're Looking For

**High Impact Contributions:**

- Bug fixes (especially state/rendering and accessibility issues)
- Accessibility (jsx-a11y) and UX improvements
- Performance improvements (bundle size, render performance)
- Documentation improvements

**Feature Contributions:**

- New views and components
- Better error handling and empty/loading states
- Improved theming and responsiveness

## Response Times and Review Process

Due to limited development resources:

- **Issue responses**: we aim to acknowledge new issues within a few days
- **Pull request reviews**: may take time depending on complexity and workload
- **Documentation updates**: generally reviewed quickly as they're high-impact, low-risk

## Recognition

All contributors are recognized in our [AUTHORS.md](AUTHORS.md) file. We appreciate every contribution, from small fixes to major features!

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

## License

By contributing to Hyperweaver UI, you agree that your contributions will be licensed under the [GPL-3.0 License](LICENSE.md).
