const https = require('https');

async function tryLog(question, answer, source) {
  try {
    const { createClient } = require('@vercel/postgres');
    const client = createClient();
    await client.connect();
    await client.sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        source VARCHAR(20) DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await client.sql`
      INSERT INTO conversations (question, answer, source)
      VALUES (${question}, ${answer}, ${source || 'manual'})
    `;
    await client.end();
  } catch (_) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')   { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API key no configurada' });
    return;
  }

  const { messages, system, model, max_tokens, source } = req.body || {};
  const lastUserMessage = Array.isArray(messages) && messages.length > 0
    ? messages[messages.length - 1].content
    : '';

  const body = JSON.stringify({ model, max_tokens, system, messages });

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
      proxyRes.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          const answerText = parsed.content && parsed.content[0]
            ? parsed.content[0].text : '';
          res.status(proxyRes.statusCode).json(parsed);
          if (answerText && lastUserMessage) {
            await tryLog(lastUserMessage, answerText, source || 'manual');
          }
        } catch (_) {
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
