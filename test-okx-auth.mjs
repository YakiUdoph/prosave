import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Read .env manually
try {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let value = trimmed.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
} catch (err) {
  console.error("Failed to read .env file:", err.message);
}

const apiKey = process.env.OKX_API_KEY;
const secretKey = process.env.OKX_SECRET_KEY;
const passphrase = process.env.OKX_PASSPHRASE || process.env.OKX_API_PASSPHRASE;
const projectId = process.env.OKX_PROJECT_ID;

if (!apiKey || !secretKey || !passphrase) {
  console.error("Error: Missing OKX API key, secret, or passphrase in the .env file.");
  process.exit(1);
}

// Generate the timestamp in ISO format
const timestamp = new Date().toISOString();
const method = 'GET';
const requestPath = '/api/v6/dex/aggregator/quote?chainIndex=196&fromTokenAddress=0xe7b000003a45145decf8a28fc755ad5ec5ea025a&toTokenAddress=0xb6ceceab302e2e4948951ee7843fc24e92933061&amount=1000000000000000000';
const body = '';

// Generate HMAC-SHA256 signature
const prehash = timestamp + method + requestPath + body;
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(prehash)
  .digest('base64');

const headers = {
  'OK-ACCESS-KEY': apiKey,
  'OK-ACCESS-SIGN': signature,
  'OK-ACCESS-TIMESTAMP': timestamp,
  'OK-ACCESS-PASSPHRASE': passphrase,
  'Content-Type': 'application/json',
};

if (projectId) {
  headers['OK-ACCESS-PROJECT'] = projectId;
}

try {
  const url = `https://web3.okx.com${requestPath}`;
  const response = await fetch(url, {
    method,
    headers,
  });

  const status = response.status;
  const json = await response.json();

  const bizCode = json.code;
  const bizMsg = json.msg;
  const isSuccess = status === 200 && bizCode === '0';

  console.log(`HTTP Status: ${status}`);
  console.log(`Business Status Code: ${bizCode || 'N/A'}`);
  console.log(`Authentication Result: ${isSuccess ? 'SUCCESS' : 'FAILURE'}`);

  if (isSuccess) {
    console.log("Result Summary: Successfully retrieved quote.");
    console.log(JSON.stringify(json.data, null, 2));
  } else {
    console.log(`Result Summary: Request failed. Msg: "${bizMsg || 'N/A'}"`);
  }
} catch (error) {
  console.log(`Authentication Result: FAILURE`);
  console.log(`Error: ${error.message}`);
}
