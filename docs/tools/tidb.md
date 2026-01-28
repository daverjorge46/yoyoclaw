---
summary: "TiDB tool (mysql CLI) for durable structured storage and analysis"
read_when:
  - You want to store/query large structured data in TiDB
  - You use TiDB Cloud and have a Connect panel .env snippet
---

# TiDB tool

Clawdbot ships a `tidb` tool that talks to **TiDB over the MySQL protocol** by invoking the local `mysql` CLI.

Use it when you want results to be **durable and queryable** (analysis, reporting, large tables), not for small ephemeral notes.

## TiDB Cloud setup

In TiDB Cloud, open your cluster **Connect** panel:

1) Set **Connect With** → **General**
2) Copy the **Connection String** like:

```text
mysql://your.cluster.id.root:<PASSWORD>@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test
```

3) Put it directly into the **gateway host** env file as `TIDB_URL`:

```bash
cat >> ~/.clawdbot/.env <<'EOF'
TIDB_URL=mysql://your.cluster.id.root:<PASSWORD>@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test
EOF
```

4) Enable the tool in `~/.clawdbot/clawdbot.json`:

```json5
{
  tools: {
    tidb: { enabled: true }
  }
}
```

Notes:
- For `*.tidbcloud.com` hosts, Clawdbot defaults to `mysql --ssl-mode=VERIFY_IDENTITY`.
- Credentials in env vars are visible to the gateway process; use a dedicated database user with minimal privileges.

## Using the tool

Call the `tidb` tool with:
- `sql` (required)
- `database` (optional override)
- `format`: `rows` (default, parses first result set) or `raw`
- `timeoutSeconds` (optional)

Example:

```sql
SELECT VERSION();
```

See also: [Env vars](/help/faq#env-vars-and-env-loading).
