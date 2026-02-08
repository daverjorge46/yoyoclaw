# Changelog

Docs: https://docs.openclaw.ai

## Unreleased

### Added

- Bedrock: add cross-region inference profile discovery for improved availability and resilience.
  - New \`models.bedrockDiscovery.includeInferenceProfiles\` config option (defaults to \`true\`)
  - Discovers both foundation models and inference profiles (e.g., \`us.anthropic.claude-3-haiku-20240307-v1:0\`)
  - Inference profiles inherit capabilities from their underlying foundation models
  - See [Bedrock documentation](https://docs.openclaw.ai/bedrock) for details

### Fixed

- Bedrock: fix cache key to include \`includeInferenceProfiles\` setting, ensuring discovery respects configuration changes
- Bedrock: validate inference profile capabilities against foundation models to prevent surfacing unusable models

## 2026.2.6-4
