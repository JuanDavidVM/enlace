const { createClient } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { question, answer, source } = req.body || {};
  if (!question || !answer) { res.status(400).json({ error: 'Faltan campos' }); return; }

  try {
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
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar' });
  }
};
