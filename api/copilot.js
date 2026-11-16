// Vercel Serverless Function — secure Claude proxy for FlowPilot Copilot.
//
// The browser never sees the API key. Set these in Vercel → Project Settings →
// Environment Variables, then set VITE_AI_MODE=claude and redeploy:
//   ANTHROPIC_API_KEY  (required for this route)
//   ANTHROPIC_MODEL    (optional, defaults below)
// Without a key this route returns 501 and the app falls back to local mode.

const SYSTEM = `You are FlowPilot Copilot, an AI assistant inside a CRM and business-automation platform.
Answer using ONLY the JSON context provided about the user's leads, workflows and activity.
Be concise, specific and actionable: reference leads by name, use numbers from the context, and end with a recommended next step.
Never claim to have sent emails or executed external integrations. If drafting an email, present it as a draft.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });

  const { query, history = [], context = {} } = req.body || {};
  if (typeof query !== 'string' || !query.trim() || query.length > 2000) {
    return res.status(400).json({ error: 'A query between 1 and 2000 characters is required' });
  }

  const messages = [
    ...history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
      .map((m) => ({ role: m.role, content: m.text.slice(0, 4000) })),
    { role: 'user', content: `CRM context (JSON):\n${JSON.stringify(context).slice(0, 60000)}\n\nQuestion: ${query}` },
  ];

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 900,
        system: SYSTEM,
        messages,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: data?.error?.message || 'Upstream error' });
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach the Claude API' });
  }
}
