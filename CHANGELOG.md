# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2021-09-20
### Fixed
- Deployments with no changes will no longer update the CFN stack

## [0.2.0] - 2021-09-16
### Fixed
- Lowered function timeout to 28 seconds (eliminating warning about API Gateway timing out before the function)

### Changed
- Dropped temporary directory dependency (in favor of direct streaming)
- Updated eslint dependencies

## [0.1.0] - 2021-09-16
### Added

- Initial release

[Unreleased]: https://github.com/troyready/serverless-hashicorp-releases-cacher/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/troyready/serverless-hashicorp-releases-cacher/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/troyready/serverless-hashicorp-releases-cacher/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/troyready/serverless-hashicorp-releases-cacher/releases/tag/v0.1.0
