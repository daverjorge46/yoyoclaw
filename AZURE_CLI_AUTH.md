# Azure CLI Auto-Authentication

## Overview

OpenClaw now supports **automatic Azure CLI token refresh** for Azure providers. When configured with `auth: "token"`, Azure providers will automatically fetch fresh tokens from Azure CLI (`az account get-access-token`) when tokens are missing or expired.

## Features

- **Automatic token fetching**: No manual token entry required
- **Token caching**: Tokens are cached for ~55 minutes (5 min buffer before expiry)
- **Dual resource support**: Automatically selects correct Azure resource:
  - `https://ml.azure.com` for Azure AI Foundry providers
  - `https://cognitiveservices.azure.com` for Azure OpenAI providers
- **Fallback mechanism**: If auth profiles have expired tokens, automatically falls back to Azure CLI
- **Zero configuration**: Works out-of-the-box with Azure CLI authentication

## How It Works

### 1. Token Resolution Flow

```
┌─────────────────────────────────────────────────────────┐
│ API Request                                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Check Auth Profile                                      │
│  - Has token?                                          │
│  - Is token expired?                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
          ┌───────────────┴───────────────┐
          │ Token Valid?                  │
          └───────┬───────────────┬───────┘
                  │               │
                 Yes             No
                  │               │
                  │               ↓
                  │   ┌─────────────────────────────┐
                  │   │ Is Azure Provider?          │
                  │   └───────┬─────────────────────┘
                  │           │
                  │          Yes
                  │           │
                  │           ↓
                  │   ┌─────────────────────────────┐
                  │   │ Call Azure CLI:             │
                  │   │ az account get-access-token │
                  │   │ --resource <url>            │
                  │   └───────┬─────────────────────┘
                  │           │
                  │           ↓
                  │   ┌─────────────────────────────┐
                  │   │ Cache Token                 │
                  │   │ (expires - 5 min)           │
                  │   └───────┬─────────────────────┘
                  │           │
                  └───────────┴───────────────┐
                                              │
                                              ↓
                                  ┌───────────────────────┐
                                  │ Return Bearer Token   │
                                  └───────────────────────┘
```

### 2. Token Caching

Tokens are cached per resource URL with automatic expiration:

```typescript
{
  token: "eyJ0eXAiOiJKV1QiLCJhbGc...",
  expiresAt: 1738728000000,  // JWT exp - 5 min buffer
  resource: "https://ml.azure.com"
}
```

Cache is checked on each request:

- If token expires in >5 minutes → use cached token
- If token expires in <5 minutes → fetch new token
- Cache persists for the gateway process lifetime

## Setup

### Prerequisites

1. **Azure CLI installed and authenticated**:

   ```bash
   az login
   az account set --subscription <subscription-id>
   ```

2. **Verify Azure CLI works**:
   ```bash
   az account get-access-token --resource https://ml.azure.com
   ```

### Configuration

#### Option 1: Via Onboarding Wizard (Recommended)

Run the onboarding wizard and select Azure:

```bash
openclaw configure
```

Select:

1. Azure AI Foundry (Model-as-a-Service) or Azure OpenAI
2. Choose your subscription and resource
3. Select deployed models

The wizard will automatically:

- Configure providers with `auth: "token"`
- Create auth profiles (even with empty tokens)
- Enable automatic Azure CLI token refresh

#### Option 2: Manual Configuration

**1. Configure providers in `~/.openclaw/openclaw.json`:**

```json
{
  "models": {
    "providers": {
      "azure-foundry": {
        "baseUrl": "https://your-resource.services.ai.azure.com",
        "api": "anthropic-messages",
        "auth": "token",
        "models": []
      },
      "azure-foundry-embeddings": {
        "baseUrl": "https://your-resource.services.ai.azure.com",
        "api": "openai-completions",
        "auth": "token",
        "models": []
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "azure-foundry/claude-opus-4-5"
      },
      "memorySearch": {
        "enabled": true,
        "provider": "azure-foundry-embeddings",
        "model": "text-embedding-3-large"
      }
    }
  }
}
```

**2. Create auth profiles in `~/.openclaw/agents/main/agent/auth-profiles.json`:**

```json
{
  "version": 1,
  "order": {
    "azure-foundry": ["azure-foundry:default"],
    "azure-foundry-embeddings": ["azure-foundry-embeddings:default"]
  },
  "profiles": {
    "azure-foundry:default": {
      "type": "token",
      "provider": "azure-foundry",
      "token": "",
      "expires": 0
    },
    "azure-foundry-embeddings:default": {
      "type": "token",
      "provider": "azure-foundry-embeddings",
      "token": "",
      "expires": 0
    }
  },
  "usage": {}
}
```

**Note**: Tokens can be empty or expired - Azure CLI will automatically fetch fresh ones!

## Verification

### Check Auth Status

```bash
openclaw models status
```

Expected output:

```
Auth overview
Auth store    : ~/.openclaw/agents/main/agent/auth-profiles.json
Providers w/ OAuth/tokens (2): azure-foundry (1), azure-foundry-embeddings (1)
- azure-foundry effective=profiles:... | profiles=1 (oauth=0, token=1, api_key=0)
- azure-foundry-embeddings effective=profiles:... | profiles=1 (oauth=0, token=1, api_key=0)

OAuth/token status
- azure-foundry
  - azure-foundry:default static
- azure-foundry-embeddings
  - azure-foundry-embeddings:default static
```

### Verify Gateway

```bash
openclaw gateway run --bind loopback --port 18789
```

Check logs for:

```
agent model: azure-foundry/claude-opus-4-5
listening on ws://127.0.0.1:18789
```

## Validation & Troubleshooting

### Use Doctor Command

Run the doctor command to validate your Azure setup:

```bash
openclaw doctor
```

**What it checks:**

- ✅ Azure CLI installation (`az --version`)
- ✅ Azure CLI authentication status (`az account show`)
- ✅ Empty token profiles (will note they use Azure CLI)
- ✅ Azure provider configuration in config file

**Example output:**

```
┌ Azure auth
│
│ Empty token profiles detected (will use Azure CLI): azure-foundry:default, azure-foundry-embeddings:default
│
└
```

If Azure CLI is not installed or not logged in, you'll see specific instructions.

### Azure CLI Not Found

**Error**: Token fetch fails silently

**Solution**:

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login
```

### Wrong Subscription

**Error**: 403 Forbidden / Unauthorized

**Solution**:

```bash
# List subscriptions
az account list -o table

# Set correct subscription
az account set --subscription <subscription-id>

# Verify
az account show
```

### Token Expiration

**Behavior**: Tokens automatically refresh when expired

**Manual refresh** (if needed):

```bash
az account get-access-token --resource https://ml.azure.com
```

Cache is automatically invalidated when token expires.

### Gateway Not Using Azure CLI

**Symptom**: "No API key found for provider" error

**Solution**:

1. Verify provider has `auth: "token"` in config
2. Verify auth profiles exist (even with empty tokens)
3. Verify Azure CLI authentication works:
   ```bash
   az account get-access-token --resource https://ml.azure.com --query accessToken -o tsv
   ```

## Implementation Details

### Files Modified

1. **src/agents/azure-discovery.ts**
   - Added `getAzureCLIToken()` with caching
   - Refactored existing token functions to use cache

2. **src/agents/auth-profiles/oauth.ts**
   - Added Azure provider detection in `resolveApiKeyForProfile()`
   - Automatic CLI token fetch for expired/missing Azure tokens

3. **src/agents/model-auth.ts**
   - Added async `resolveAzureCliAuthInfo()`
   - Added fallback to Azure CLI when profiles fail for Azure providers

### Token Cache Structure

```typescript
type CachedAzureToken = {
  token: string; // JWT bearer token
  expiresAt: number; // Timestamp (ms) when token expires
  resource: string; // Azure resource URL
};

// In-memory cache (per process)
Map<resource, CachedAzureToken>;
```

### Resource Selection Logic

```typescript
function selectAzureResource(provider: string): string {
  if (provider.includes("foundry") || provider.includes("anthropic")) {
    return "https://ml.azure.com";
  }
  return "https://cognitiveservices.azure.com";
}
```

## Comparison with Manual Token Management

| Feature            | Manual Tokens               | Azure CLI Auto-Refresh       |
| ------------------ | --------------------------- | ---------------------------- |
| Initial setup      | Copy/paste token            | Run `az login` once          |
| Token refresh      | Manual every ~1 hour        | Automatic                    |
| Multiple resources | Separate token per resource | Automatic resource detection |
| Security           | Tokens in files             | Azure CLI keychain           |
| Configuration      | Must update config files    | Zero config after setup      |
| Error handling     | Silent failures             | Automatic retry              |

## Best Practices

1. **Use Azure CLI authentication** in development and personal deployments
2. **Use Service Principal** or Managed Identity in production (CI/CD)
3. **Keep Azure CLI updated**: `az upgrade`
4. **Monitor token usage**: Check gateway logs for auth failures
5. **Test authentication** after subscription changes: `openclaw models status`

## Future Enhancements

- [ ] Support for Service Principal authentication
- [ ] Support for Managed Identity (Azure VMs/AKS)
- [ ] Configurable token cache TTL
- [ ] Token refresh callbacks/hooks
- [ ] Multi-tenant support
- [ ] Token storage in auth-profiles.json (optional)

## Related Documentation

- [Azure OpenAI Configuration](docs/providers/azure-openai.md)
- [Azure AI Foundry Setup](docs/providers/azure-foundry.md)
- [Authentication Overview](docs/gateway/authentication.md)
- [Model Providers](docs/concepts/model-providers.md)
