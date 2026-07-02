const { createClient } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).end(); return; }

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  try {
    const client = createClient();
    await client.connect();

    const { rows: conversations } = await client.sql`
      SELECT id, question, answer, source, created_at
      FROM conversations
      ORDER BY created_at DESC
      LIMIT 500
    `;

    const { rows: totalRows } = await client.sql`
      SELECT COUNT(*) as total FROM conversations
    `;

    const { rows: todayRows } = await client.sql`
      SELECT COUNT(*) as today
      FROM conversations
      WHERE created_at >= CURRENT_DATE
    `;

    const { rows: weekRows } = await client.sql`
      SELECT COUNT(*) as week
      FROM conversations
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

    const { rows: bySource } = await client.sql`
      SELECT source, COUNT(*) as count
      FROM conversations
      GROUP BY source
      ORDER BY count DESC
    `;

    const { rows: byDay } = await client.sql`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM conversations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    const { rows: topQuestions } = await client.sql`
      SELECT question, COUNT(*) as count
      FROM conversations
      GROUP BY question
      ORDER BY count DESC
      LIMIT 10
    `;

    const { rows: avgLength } = await client.sql`
      SELECT
        ROUND(AVG(LENGTH(question))) as avg_question_len,
        ROUND(AVG(LENGTH(answer))) as avg_answer_len
      FROM conversations
    `;

    await client.end();

    res.status(200).json({
      stats: {
        total: parseInt(totalRows[0].total),
        today: parseInt(todayRows[0].today),
        week: parseInt(weekRows[0].week),
        avg_question_len: parseInt(avgLength[0]?.avg_question_len || 0),
        avg_answer_len: parseInt(avgLength[0]?.avg_answer_len || 0)
      },
      by_source: bySource,
      by_day: byDay,
      top_questions: topQuestions,
      conversations
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar reportes' });
  }
};
