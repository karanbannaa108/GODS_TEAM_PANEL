
# GODS TEAM PANEL - Production-ready (PhonePe S2S callback)

This project contains a frontend and a Node.js/Express backend prepared to receive PhonePe Server-to-Server callbacks and unlock a panel when a payment completes.
**IMPORTANT:** You must have a PhonePe merchant account (merchant id + salt) and set the callback URL in PhonePe dashboard.

## Files
- `frontend/` - static site (index, styles, app.js)
- `server.js` - Express backend (create-session, check-status, payment-callback)
- `.env.example` - environment variables placeholder
- `package.json` - Node dependencies and script

## How it works (overview)
1. Frontend requests `/api/create-session` to get a sessionId.
2. Use that `sessionId` as `transactionContext.storeId` when creating your **static QR** payload (PhonePe offline integration). The PhonePe S2S callback will include `transactionContext.storeId` so server knows which session paid.
3. PhonePe calls your `CALLBACK_URL` with payload and header `X-VERIFY` (checksum).
4. Server verifies checksum using `PHONEPE_SALT` and, if valid and payment completed, marks the session paid.
5. Frontend polls `/api/check-status?sessionId=...` to see `paid:true` and unlocks the panel.

## Deploy (quick guide)
### Render (recommended, free-ish)
1. Create a new Web Service on Render (Docker or Node). Connect to repo or upload files.
2. Set **Environment** variables in Render dashboard:
   - `MERCHANT_ID`
   - `PHONEPE_SALT`
   - `CALLBACK_URL` (https://your-domain.com/api/payment-callback)
3. Deploy. Make sure the site uses HTTPS (Render provides this).
4. In PhonePe merchant console set Server-to-Server callback URL to the `CALLBACK_URL` above.

### Local testing (Node)
```bash
npm install
export PHONEPE_SALT="your_salt"
export MERCHANT_ID="your_mid"
node server.js
# server runs on http://localhost:3000
```

## PhonePe settings
Follow PhonePe static QR S2S docs. The callback payload must include a `transactionContext.storeId` that equals the `sessionId` created by frontend.

## Security notes
- Do NOT commit your `PHONEPE_SALT` to public repos.
- Use HTTPS for callback URL.
- Use a persistent DB (Redis/Postgres) instead of in-memory `sessions` for production.
- Validate IPs / rate-limit callbacks for extra security.

## Sample callback payload (for testing)
Use this JSON to simulate PhonePe POST to `/api/payment-callback`:
```json
{
  "success": true,
  "code": "PAYMENT_SUCCESS",
  "message": "Your payment is successful.",
  "data": {
    "transactionId": "TX32321849644234",
    "merchantId": "M2306160483220675579140",
    "providerReferenceId": "P1806151323093900554957",
    "amount": 1000,
    "paymentState": "COMPLETED",
    "payResponseCode": "SUCCESS",
    "paymentModes": [
      {"mode":"ACCOUNT","amount":1000,"utr":"816626521616"}
    ],
    "transactionContext": {"storeId":"REPLACE_WITH_SESSION_ID"}
  }
}
```

Replace `REPLACE_WITH_SESSION_ID` with the sessionId created by frontend to simulate a real callback.

---
If you want, I can also provide a phone-friendly step-by-step to deploy this code to Render or Railway. 
