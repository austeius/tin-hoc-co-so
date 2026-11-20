const MODEL_CONFIG = {
  providers: [
    {
      name: 'Google Gemini',
      key_env: 'GEMINI_API_KEY',
      models: [
        { id: 'gemini-2.0-flash', display: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-flash', display: 'Gemini 1.5 Flash' },
        { id: 'gemini-1.5-pro', display: 'Gemini 1.5 Pro' },
        { id: 'gemini-2.5-flash', display: 'Gemini 2.5 Flash' }
      ]
    },
    {
      name: 'Anthropic Claude',
      key_env: 'ANTHROPIC_API_KEY',
      models: [
        { id: 'claude-3-5-sonnet-20241022', display: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', display: 'Claude 3.5 Haiku' }
      ]
    },
    {
      name: 'OpenAI GPT',
      key_env: 'OPENAI_API_KEY',
      models: [
        { id: 'gpt-4o', display: 'GPT-4o' },
        { id: 'gpt-4o-mini', display: 'GPT-4o Mini' }
      ]
    }
  ]
};

function findProviderForModel(modelId) {
  for (const p of MODEL_CONFIG.providers) {
    for (const m of p.models) {
      if (m.id === modelId) return { provider: p, model: m };
    }
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, messages, systemPrompt } = req.body || {};
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Thiếu model hoặc messages hợp lệ' });
    }

    const info = findProviderForModel(model);
    if (!info) return res.status(400).json({ error: 'Model không hợp lệ: ' + model });

    const rawKey = process.env[info.provider.key_env];
    if (!rawKey || rawKey.trim() === '' || rawKey.includes('YOUR_')) {
      return res.status(403).json({
        error: `Chưa cấu hình API key cho ${info.provider.name} (${info.provider.key_env}).`,
        code: 'NOT_CONFIGURED'
      });
    }
    const apiKey = rawKey.trim();

    let reply = '';
    if (info.provider.key_env === 'GEMINI_API_KEY') {
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const body = { contents };
      if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return res.status(resp.status).json({ error: `Gemini API lỗi (${resp.status}): ${errText}` });
      }

      const data = await resp.json();
      reply = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    } else {
      return res.status(400).json({ error: 'Nhà cung cấp chưa được hỗ trợ trên serverless endpoint' });
    }

    return res.status(200).json({
      reply,
      model: info.model.id,
      displayModel: info.model.display
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
