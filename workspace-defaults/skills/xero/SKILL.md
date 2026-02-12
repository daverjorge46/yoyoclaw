---
name: xero
description: Xero API integration for accounting data including bank balances, invoices, bills, and financial reports. Use when the user asks about cash position, accounts receivable/payable, or any Xero financial data.
---

# Xero API Documentation

Reference documentation for Xero's APIs. Use when answering questions about Xero data, integrations, or API behavior.

## Authentication

Xero credentials are available as environment variables:
- `XERO_ACCESS_TOKEN` - Bearer token for API calls
- `XERO_TENANT_ID` - Organization identifier

## Making API Calls

```python
import os
import requests

response = requests.get(
    "https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss",
    headers={
        "Authorization": f"Bearer {os.environ['XERO_ACCESS_TOKEN']}",
        "xero-tenant-id": os.environ["XERO_TENANT_ID"],
        "Accept": "application/json",
    }
)
data = response.json()
```

## API Modules

| Module | Description |
|--------|-------------|
| accounting | Core accounting: invoices, payments, contacts, bank transactions, credit notes, reports |
| assets | Fixed asset management, valuations, and depreciation |
| payrolluk | UK payroll: employees, payslips, leave, timesheets, tax |
| projects | Project time/cost tracking and profitability reporting |
| files | File/folder management and associations to invoices, contacts, payments |
| practice-manager-3-1 | Accountancy practice workflow, time tracking, job costing |
| xero-app-store | App subscriptions, pricing, and automated payment collection (UK/AU/NZ) |

## Key Concepts

- **Invoice Types**: ACCREC (sales invoices), ACCPAY (purchase bills)
- **Timestamps**: All dates in UTC, format YYYY-MM-DD
- **Currency**: ISO 4217 codes (GBP, USD, EUR, etc.)
- **Status Codes**: DRAFT → SUBMITTED → AUTHORISED → PAID/VOIDED

## Resources

See `resources/[module-name]/` for full API documentation. Start with `overview.md` in each module.
