const https = require('https');

function logConversation(question, answer, source) {
  const body = JSON.stringify({ question, answer, source });
  const options = {
    hostname: 'localhost',
    port: process.env.VERCEL_URL ? 443 : 3000,
    path: '/api/log',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const logBody = JSON.stringify({ question, answer, source });

  const { createClient } = require('@vercel/postgres');
  const client = createClient();

  client.connect().then(() => {
    return client.sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        source VARCHAR(20) DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  }).then(() => {
    return client.sql`
      INSERT INTO conversations (question, answer, source)
      VALUES (${question}, ${answer}, ${source || 'manual'})
    `;
  }).then(() => {
    client.end();
  }).catch(() => {
    client.end().catch(() => {});
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API key no configurada' });
    return;
  }

  const { messages, system, source } = req.body;
  const lastUserMessage = messages && messages.length > 0
    ? messages[messages.length - 1].content
    : '';

  const body = JSON.stringify({ model: req.body.model, max_tokens: req.body.max_tokens, system, messages });

  await new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const answerText = parsed.content && parsed.content[0] ? parsed.content[0].text : '';
          if (answerText && lastUserMessage) {
            logConversation(lastUserMessage, answerText, source || 'manual');
          }
          res.status(proxyRes.statusCode).json(parsed);
        } catch (e) {
          res.status(502).json({ error: 'Respuesta invalida de la API' });
        }
        resolve();
      });
    });

    proxyReq.on('error', () => {
      res.status(502).json({ error: 'Error conectando con la API' });
      resolve();
    });

    proxyReq.write(body);
    proxyReq.end();
  });
};
