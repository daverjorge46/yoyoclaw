# OpenClaw Kubernetes Deployment

Standard Kubernetes manifests for deploying OpenClaw Gateway on k3s/k8s.

## Prerequisites

- A running Kubernetes cluster (k3s or k8s) with Traefik ingress controller.
- `kubectl` configured to communicate with your cluster.
- [ExternalDNS](https://github.com/kubernetes-sigs/external-dns) configured with Cloudflare (for automatic DNS record creation).

## Community Helm Charts

If you prefer using Helm, there are community-maintained charts available:

- **[Chrisbattarbee/openclaw-helm](https://github.com/Chrisbattarbee/openclaw-helm)**: A comprehensive chart with support for configuration injection, persistence, and ingress.
- **[serhanekicii/openclaw-helm](https://github.com/serhanekicii/openclaw-helm)**: Another popular community chart.

## Quick Start

```bash
# 1. Configure your gateway token
export TOKEN=$(openssl rand -hex 32)
kubectl create secret generic openclaw-secret \
  --from-literal=OPENCLAW_GATEWAY_TOKEN="$TOKEN"

# 2. Deploy everything
kubectl apply -f pvc.yaml -f deployment.yaml -f service.yaml -f ingress.yaml

# 3. Verify
kubectl get pods -l app=openclaw
kubectl logs -f deployment/openclaw-gateway
```

## Manifests

| File              | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `secret.yaml`     | Gateway token secret (template)               |
| `pvc.yaml`        | Persistent storage for config/sessions (10Gi) |
| `deployment.yaml` | Gateway deployment (1 replica)                |
| `service.yaml`    | ClusterIP service (ports 18789, 18790)        |
| `ingress.yaml`    | Traefik IngressRoute for HTTPS access         |

## DNS and TLS

The `ingress.yaml` uses a Traefik IngressRoute with:

- `Host(\`openclaw.vibebrowser.app\`)` match rule (ExternalDNS picks this up automatically).
- `external-dns.alpha.kubernetes.io/cloudflare-proxied: "true"` annotation to enable Cloudflare proxy (handles TLS termination).
- `entryPoints: [web, websecure]` for both HTTP and HTTPS.

ExternalDNS creates the Cloudflare A record automatically. With `--default-targets` configured in ExternalDNS, the record points to the cluster public IP. Cloudflare proxy provides edge TLS.

**Customization:** Update the `Host()` match rule in `ingress.yaml` to use your own domain.

## Accessing the Gateway

Once deployed, the gateway is accessible at:

- **HTTPS:** `https://openclaw.vibebrowser.app` (via Cloudflare proxy)
- **Port Forwarding:** `kubectl port-forward service/openclaw-service 18789:18789`

## Customization

- **Image:** Update `deployment.yaml` to point to a specific Docker image tag.
- **Resources:** Adjust CPU and memory limits in `deployment.yaml` based on your cluster capacity.
- **Storage:** Edit `pvc.yaml` to adjust the storage size (default 10Gi).
