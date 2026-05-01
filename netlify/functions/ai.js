exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { provider, prompt, model } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid prompt' }) };
  }

  try {
    if (provider === 'groq') {
      const key = process.env.GROQ_API_KEY;
      if (!key) return { statusCode: 503, body: JSON.stringify({ error: 'Groq not configured' }) };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({
          model: model || 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 700,
          temperature: 0.4
        })
      });
      const data = await res.json();
      if (data.error) return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: data.choices[0].message.content })
      };
    }

    if (provider === 'claude') {
      const key = process.env.CLAUDE_API_KEY;
      if (!key) return { statusCode: 503, body: JSON.stringify({ error: 'Claude not configured' }) };

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-haiku-4-5-20251001',
          max_tokens: 700,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await res.json();
      if (data.error) return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: data.content[0].text })
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown provider' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
