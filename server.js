// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const {
  PAYU_KEY,
  PAYU_SALT,
  PAYU_BASE_URL,
  PAYU_SUCCESS_URL,
  PAYU_FAILURE_URL,
  PORT = 7000,
} = process.env;

// Build hash with exactly 10 empty fields between email and salt
function generateHash({ key, txnid, amount, productinfo, firstname, email }) {
  const head = [key, txnid, amount, productinfo, firstname, email].join('|');
  const empties = Array(10).fill('').join('|'); // yields 10 pipes: ||||||||||
  const hashString = `${head}|${empties}|${PAYU_SALT}`;

  console.log('Corrected HashString:', hashString);
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

app.post('/api/payment', (req, res) => {
  const { fullName, email, mobile, amount } = req.body;
  const txnid      = `txn_${Date.now()}`;
  const productinfo = 'Payment';

  // Prepare the data
  const payload = {
    key:          PAYU_KEY,
    txnid,
    amount:       amount.toString(),
    productinfo,
    firstname:    fullName,
    email,
    phone:        mobile,
    surl:         PAYU_SUCCESS_URL,
    furl:         PAYU_FAILURE_URL,
    service_provider: 'payu_paisa'
  };

  // Generate hash
  const hash = generateHash(payload);

  // Build auto-submitting form
  const formFields = Object.entries({ ...payload, hash })
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}"/>`)
    .join('\n');

  res.send(`
    <html><head><title>Redirecting to PayU…</title></head>
      <body onload="document.forms[0].submit()">
        <form method="post" action="${PAYU_BASE_URL}">
          ${formFields}
          <noscript><button>Proceed to PayU</button></noscript>
        </form>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
