const { createClient } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')    { res.status(405).end(); return; }

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  let client;
  try {
    client = createClient();
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

    const [total, today, week, bySource, byDay, topQ, avgLen, convs] = await Promise.all([
      client.sql`SELECT COUNT(*) as total FROM conversations`,
      client.sql`SELECT COUNT(*) as today FROM conversations WHERE created_at >= CURRENT_DATE`,
      client.sql`SELECT COUNT(*) as week FROM conversations WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      client.sql`SELECT source, COUNT(*) as count FROM conversations GROUP BY source ORDER BY count DESC`,
      client.sql`
        SELECT DATE(created_at) as day, COUNT(*) as count
        FROM conversations
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY day ASC`,
      client.sql`
        SELECT question, COUNT(*) as count FROM conversations
        GROUP BY question ORDER BY count DESC LIMIT 10`,
      client.sql`
        SELECT ROUND(AVG(LENGTH(question))) as avg_question_len,
               ROUND(AVG(LENGTH(answer)))   as avg_answer_len
        FROM conversations`,
      client.sql`
        SELECT id, question, answer, source, created_at
        FROM conversations ORDER BY created_at DESC LIMIT 500`
    ]);

    await client.end();

    res.status(200).json({
      stats: {
        total:            parseInt(total.rows[0].total),
        today:            parseInt(today.rows[0].today),
        week:             parseInt(week.rows[0].week),
        avg_question_len: parseInt(avgLen.rows[0]?.avg_question_len || 0),
        avg_answer_len:   parseInt(avgLen.rows[0]?.avg_answer_len   || 0)
      },
      by_source:     bySource.rows,
      by_day:        byDay.rows,
      top_questions: topQ.rows,
      conversations: convs.rows
    });
  } catch (err) {
    if (client) await client.end().catch(() => {});
    res.status(500).json({ error: 'Error al consultar', detail: err.message });
  }
};
