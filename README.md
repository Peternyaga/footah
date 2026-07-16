# The Final Whistle

A mobile-first interactive prototype for a private 2026 World Cup Final office pool.

## Included

- Public pool totals and match countdown
- Participant registration with Kenyan Safaricom number validation
- Editable finalist names and routes
- Manual M-Pesa confirmation-code workflow
- Pending receipt and private phone-number masking
- Shared participant chat
- Admin reconciliation dashboard
- Double-confirm winner declaration and payout summary
- Responsive desktop and mobile layouts

## Run locally

```bash
npm install
npm run dev
```

The preview admin passcode is `FINAL26`.

## Production note

This version is intentionally a safe interactive prototype. Its demo data and browser storage must be replaced with authenticated server-side persistence before collecting real payments or personal data. The refined brief recommends PHP + MySQL; the same interface can be connected to that backend, or rebuilt with a managed database and server routes on a compatible host.
