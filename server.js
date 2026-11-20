// server.js – Backend cho web ôn thi Tin học cơ sở UTC
// Đọc API key từ file .env (hoặc biến môi trường hệ thống)

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ─── Đọc .env ───────────────────────────────────────────────────────────────
function loadEnv() {
  const possiblePaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env')
  ];
  for (const envPath of possiblePaths) {
    if (!fs.existsSync(envPath)) continue;
    try {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key] && val) process.env[key] = val;
      }
    } catch (e) {
      console.warn('Lỗi đọc env:', e.message);
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT, 10) || 3000;

// ─── Cấu hình models ────────────────────────────────────────────────────────
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

function getModelsInfo() {
  return MODEL_CONFIG.providers.map(p => {
    const rawKey = process.env[p.key_env];
    const isConfigured = !!(rawKey && rawKey.trim() !== '' && !rawKey.includes('YOUR_'));
    return {
      name: p.name,
      keyEnv: p.key_env,
      configured: isConfigured,
      models: p.models
    };
  });
}

function findProviderForModel(modelId) {
  for (const p of MODEL_CONFIG.providers) {
    for (const m of p.models) {
      if (m.id === modelId) return { provider: p, model: m };
    }
  }
  return null;
}

// ─── Gọi API AI ──────────────────────────────────────────────────────────────
async function callAI(modelId, messages, systemPrompt) {
  const info = findProviderForModel(modelId);
  if (!info) {
    throw new Error('Model không hợp lệ: ' + modelId);
  }

  const rawKey = process.env[info.provider.key_env];
  if (!rawKey || rawKey.trim() === '' || rawKey.includes('YOUR_')) {
    const err = new Error(`Chưa cấu hình API key cho ${info.provider.name} (${info.provider.key_env}). Vui lòng điền khóa vào file .env.`);
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  const apiKey = rawKey.trim();

  let replyText = '';
  if (info.provider.key_env === 'GEMINI_API_KEY') {
    replyText = await callGemini(apiKey, modelId, messages, systemPrompt);
  } else if (info.provider.key_env === 'ANTHROPIC_API_KEY') {
    replyText = await callClaude(apiKey, modelId, messages, systemPrompt);
  } else if (info.provider.key_env === 'OPENAI_API_KEY') {
    replyText = await callOpenAI(apiKey, modelId, messages, systemPrompt);
  }

  return {
    reply: replyText,
    model: info.model.id,
    displayModel: info.model.display
  };
}

async function callGemini(apiKey, model, messages, systemPrompt) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body = { contents };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

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
    if (resp.status === 429 || errText.includes('RESOURCE_EXHAUSTED')) {
      const err = new Error('Gemini API đã hết hạn mức (Quota Exceeded) hoặc bị giới hạn tốc độ. Vui lòng thử lại sau.');
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    }
    if (resp.status === 400 && errText.includes('API_KEY_INVALID')) {
      const err = new Error('GEMINI_API_KEY không hợp lệ. Vui lòng kiểm tra lại file .env.');
      err.code = 'INVALID_KEY';
      throw err;
    }
    throw new Error(`Gemini API lỗi (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    return data.candidates[0].content.parts.map(p => p.text).join('');
  }
  throw new Error('Gemini không trả về nội dung hợp lệ');
}

async function callClaude(apiKey, model, messages, systemPrompt) {
  const body = {
    model,
    max_tokens: 4096,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  };
  if (systemPrompt) body.system = systemPrompt;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 429) {
      const err = new Error('Claude API đã hết hạn mức hoặc bị giới hạn tốc độ.');
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    }
    throw new Error(`Claude API lỗi (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  if (data.content && data.content[0]) {
    return data.content.map(c => c.text).join('');
  }
  throw new Error('Claude không trả về nội dung');
}

async function callOpenAI(apiKey, model, messages, systemPrompt) {
  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  msgs.push(...messages.map(m => ({ role: m.role, content: m.content })));

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: msgs, max_tokens: 4096 })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 429) {
      const err = new Error('OpenAI API đã hết hạn mức hoặc bị giới hạn tốc độ.');
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    }
    throw new Error(`OpenAI API lỗi (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  if (data.choices && data.choices[0]) {
    return data.choices[0].message.content;
  }
  throw new Error('OpenAI không trả về nội dung');
}

// ─── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.c': 'text/plain; charset=utf-8'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── API: Danh sách models và trạng thái key ──
  if (pathname === '/api/models' && req.method === 'GET') {
    loadEnv();
    return sendJSON(res, 200, { providers: getModelsInfo() });
  }

  // ── API: Hỏi AI ──
  if (pathname === '/api/chat' && req.method === 'POST') {
    loadEnv();
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { model, messages, systemPrompt } = body;

      if (!model || !messages || !Array.isArray(messages)) {
        return sendJSON(res, 400, { error: 'Thiếu model hoặc messages hợp lệ' });
      }

      const result = await callAI(model, messages, systemPrompt);
      return sendJSON(res, 200, result);
    } catch (err) {
      const status = err.code === 'NOT_CONFIGURED' ? 403 : (err.code === 'QUOTA_EXCEEDED' ? 429 : 500);
      return sendJSON(res, status, {
        error: err.message,
        code: err.code || 'API_ERROR'
      });
    }
  }

  // ── Phục vụ file tĩnh ──
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, decodeURIComponent(filePath));

  // Bảo vệ directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    if (!fs.existsSync(normalizedPath)) {
      // SPA fallback
      const indexPath = path.join(__dirname, 'index.html');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(content);
      }
      res.writeHead(404);
      return res.end('Not found');
    }

    const stat = fs.statSync(normalizedPath);
    if (stat.isDirectory()) {
      const indexPath = path.join(normalizedPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(content);
      }
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const content = fs.readFileSync(normalizedPath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  Ôn thi Tin học cơ sở UTC - Web Server       ║`);
  console.log(`  ║  Địa chỉ: http://localhost:${PORT}             ║`);
  console.log(`  ║  Dữ liệu: 113 câu hỏi & bài tập C            ║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
});
