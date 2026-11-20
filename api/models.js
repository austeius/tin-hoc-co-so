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

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const providers = MODEL_CONFIG.providers.map(p => {
    const rawKey = process.env[p.key_env];
    const isConfigured = !!(rawKey && rawKey.trim() !== '' && !rawKey.includes('YOUR_'));
    return {
      name: p.name,
      keyEnv: p.key_env,
      configured: isConfigured,
      models: p.models
    };
  });

  return res.status(200).json({ providers });
};
