# 🌿 openclaw-local

<!-- badges -->

[![CI](https://github.com/gthumb-ai/openclaw-local/actions/workflows/ci.yml/badge.svg)](https://github.com/gthumb-ai/openclaw-local/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

<!-- /badges -->

**🌱 A local-first fork of [OpenClaw](https://github.com/openclaw-ai/openclaw) that defaults to Ollama — no API keys required.**

openclaw-local is the same powerful multi-channel AI gateway, but configured out-of-the-box for local model inference. Run your own models on your own hardware with zero cloud dependencies. Built for [gthumb.ai](https://gthumb.ai) 🪴

## 🌿 Why This Fork?

OpenClaw is great, but it defaults to cloud providers. If you want to run everything locally — for privacy, cost, or just because you can — you have to reconfigure a bunch of stuff. This fork flips the defaults:

- 🌱 **Ollama is the default provider** — not Anthropic
- 🌿 **Onboarding wizard leads with local** — cloud is still there under "Advanced"
- 🍃 **Ships with local-first configs** — works out of the box with `ollama pull llama3.3`
- 🌲 **Zero cloud dependencies** — no API keys, no accounts, no billing
- 🪴 **All cloud providers still work** — just not the default

See [FORK.md](./FORK.md) for the exact diff from upstream.

## 🌱 Why local-first?

- 🔒 **Privacy**: Your conversations never leave your machine
- 🆓 **No API keys**: Get started in minutes with Ollama — no accounts, no billing
- 🌐 **Offline capable**: Works without internet once models are pulled
- 💚 **Cost**: $0/month after hardware investment
- ☁️ **Cloud fallback**: Cloud providers (Anthropic, OpenAI, etc.) still work when you want them

## 🚀 Quick Start

```bash
# 1. Install Ollama (if you haven't)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull the default model
ollama pull llama3.3

# 3. Run the setup script
./scripts/setup-local.sh

# 4. Start openclaw-local
openclaw gateway start
```

Or use the interactive onboarding wizard:

```bash
openclaw onboard
```

The wizard defaults to Ollama/local models. Cloud providers are available under "Advanced" options.

## ⚙️ Configuration

Copy the example config and customize:

```bash
cp openclaw-local.example.json ~/.openclaw/config.json
```

See [openclaw-local.example.json](./openclaw-local.example.json) for all defaults.

### Default model: `ollama/llama3.3`

You can switch models anytime:

```bash
# Use a different Ollama model
ollama pull deepseek-coder-v2
# Then update your config's model.primary to "ollama/deepseek-coder-v2"

# Or switch to a cloud provider
# Set model.primary to "anthropic/claude-sonnet-4-5" and add your API key
```

## 🌿 What's different from upstream OpenClaw?

See [FORK.md](./FORK.md) for a detailed changelog. In short:

- Default provider changed from Anthropic → Ollama
- Onboarding wizard presents local/Ollama as the first option
- Model aliases include `local` and `llama` → `ollama/llama3.3`
- Ships with local-first example config and setup script
- All cloud provider functionality is preserved — just not the default

## 📋 Requirements

- **Node.js** ≥ 22
- **pnpm** (monorepo package manager)
- **Ollama** (for local inference) — [ollama.com](https://ollama.com)
- 8GB+ RAM recommended for llama3.3 (16GB+ for larger models)

## 🛠️ Development

```bash
git clone https://github.com/gthumb-ai/openclaw-local.git
cd openclaw-local
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## License

MIT — same as upstream OpenClaw. See [LICENSE](./LICENSE).
