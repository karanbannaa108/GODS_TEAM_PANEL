const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
app.use(express.json());

// In-memory sessions store. Use a DB (Redis/Postgres) in production.
const sessions = {}; // sessionId -> { paid: boolean, tx: object, createdAt }

const PHONEPE_SALT = process.env.PHONEPE_SALT || '';
const MERCHANT_ID = process.env.MERCHANT_ID || '';

// compute checksum as SHA256(JSON + SALT) (stringified payload + salt)
function computeChecksum(payload) {
  try {
    const str = JSON.stringify(payload) + PHONEPE_SALT;
    return crypto.createHash('sha256').update(str).digest('hex');
  } catch (e) {
    return '';
  }
}

app.post('/api/create-session', (req, res) => {
  const sid = 's_' + crypto.randomBytes(8).toString('hex');
  sessions[sid] = { paid: false, createdAt: Date.now() };
  // Return session id which should be used as transactionContext.storeId on merchant QR payload
  res.json({ sessionId: sid });
});

app.get('/api/check-status', (req, res) => {
  const sid = req.query.sessionId;
  if (!sid || !sessions[sid]) return res.json({ paid: false });
  return res.json({ paid: !!sessions[sid].paid, tx: sessions[sid].tx || null });
});

// PhonePe Server-to-Server callback endpoint (set this URL in PhonePe merchant console)
app.post('/api/payment-callback', (req, res) => {
  const payload = req.body || {};
  const receivedChecksum = (req.headers['x-verify'] || '').toString();
  // If PHONEPE_SALT is set, validate checksum
  if (PHONEPE_SALT) {
    const gen = computeChecksum(payload);
    if (gen !== receivedChecksum) {
      console.error('Checksum mismatch', { gen, receivedChecksum });
      return res.status(401).json({ success: false, message: 'Invalid checksum' });
    }
  } else {
    console.warn('PHONEPE_SALT not set - skipping checksum validation (ENV not configured)');
  }

  // If payment success, mark session (transactionContext.storeId) as paid
  if (payload && payload.success && payload.data && payload.data.paymentState === 'COMPLETED') {
    const ctx = payload.data.transactionContext || {};
    const storeId = ctx.storeId || ctx.sessionId || null;
    if (storeId && sessions[storeId]) {
      sessions[storeId].paid = true;
      sessions[storeId].tx = payload.data;
      console.log('Marked session paid:', storeId);
    } else {
      // fallback: store by tx id
      const txid = payload.data.transactionId || payload.data.providerReferenceId || ('tx_' + Date.now());
      sessions[txid] = { paid: true, tx: payload.data, createdAt: Date.now() };
      console.log('Stored unmatched payment under txid:', txid);
    }
  }

  res.json({ success: true, code: 'PAYMENT_SUCCESS', message: 'Recorded' });
});

// serve frontend
const publicDir = path.join(__dirname, 'frontend');
app.use(express.static(publicDir));
app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));