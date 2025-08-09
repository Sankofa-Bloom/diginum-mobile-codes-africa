# Changelog

All notable changes to DigiNum will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Version control system for deployments
- Automated deployment scripts with semantic versioning
- GitHub Actions workflow for CI/CD
- Version information display in footer
- Deployment contexts for staging and production
- Automated changelog generation

### Changed
- Package name from `vite_react_shadcn_ts` to `diginum`
- Improved deployment process with version tagging

### Fixed
- CSP configuration for Google Fonts and external APIs
- API endpoint routing in Netlify Functions
- Frontend caching issues with clean builds

## [1.0.0] - 2025-01-09

### Added
- Complete Netlify deployment setup
- Fapshi payment gateway integration
- Countries API endpoint (133 countries)
- Account balance API endpoint
- Exchange rates API with 29 currencies
- Authentication system (signup/login)
- Content Security Policy configuration
- Environment variables setup

### Infrastructure
- Netlify Functions for serverless backend
- Supabase integration for user management
- Automated build and deployment pipeline
- Security headers and CORS configuration

### Security
- CSP headers for XSS protection
- Secure environment variable handling
- Authentication token management
- Rate limiting and security middleware