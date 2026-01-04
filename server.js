const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const BASE_URL = process.env.BASE_URL;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = {
  pendingComments: new Map(),
  approvedComments: [],
  ipTracking: new Map()
};

const hashIP = ip =>
  crypto.createHash('sha256').update(ip).digest('hex');

const getClientIP = req =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.headers['x-real-ip'] ||
  req.socket.remoteAddress ||
  req.ip;

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const generateName = () =>
  `حساب موثق رقم ${Math.floor(Math.random() * 9999) + 1}`;

const sanitize = text =>
  String(text || '').replace(/[<>]/g, '').trim();

const telegramSend = async (text, keyboard) => {
  const r = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    })
  });
  const j = await r.json();
  return j.ok ? j.result.message_id : null;
};

const telegramEdit = async (id, text) => {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      message_id: id,
      text,
      parse_mode: 'HTML'
    })
  });
};

const telegramAnswer = async (id) => {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: id
    })
  });
};

app.get('/', (req, res) => {
  res.json({ status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/submit-comment', async (req, res) => {
  const { name, text, clientId } = req.body;
  if (!text || !clientId) {
    return res.status(400).json({ error: 'invalid data' });
  }

  const ipHash = hashIP(getClientIP(req));
  const existing = storage.ipTracking.get(ipHash);
  if (existing?.status === 'approved') {
    return res.status(403).json({ error: 'already approved' });
  }

  const id = generateId();
  const comment = {
    id,
    name: name?.trim() ? sanitize(name) : generateName(),
    text: sanitize(text),
    ipHash,
    status: 'pending',
    time: Date.now()
  };

  storage.pendingComments.set(id, comment);
  storage.ipTracking.set(ipHash, { id, status: 'pending' });

  const message = `
🆕 تعليق جديد

👤 ${comment.name}
💬 ${comment.text}
🆔 ${id}
  `.trim();

  const keyboard = [[
    { text: '✅ موافقة', callback_data: `approve_${id}` },
    { text: '❌ رفض', callback_data: `reject_${id}` }
  ]];

  await telegramSend(message, keyboard);
  res.json({ success: true, commentId: id });
});

app.get('/comments', (req, res) => {
  res.json(
    storage.approvedComments.map(c => ({
      commentId: c.id,
      displayName: c.name,
      text: c.text,
      timestamp: c.time
    }))
  );
});

app.post('/webhook', async (req, res) => {
  const q = req.body?.callback_query;
  if (!q) return res.sendStatus(200);

  await telegramAnswer(q.id);

  const [action, id] = q.data.split('_');
  const comment = storage.pendingComments.get(id);
  if (!comment) return res.sendStatus(200);

  if (action === 'approve') {
    comment.status = 'approved';
    storage.approvedComments.push(comment);
    storage.ipTracking.set(comment.ipHash, { id, status: 'approved' });
    await telegramEdit(
      q.message.message_id,
      `✅ تم القبول\n\n👤 ${comment.name}\n💬 ${comment.text}`
    );
  }

  if (action === 'reject') {
    storage.ipTracking.delete(comment.ipHash);
    await telegramEdit(
      q.message.message_id,
      `❌ تم الرفض\n\n👤 ${comment.name}\n💬 ${comment.text}`
    );
  }

  storage.pendingComments.delete(id);
  res.sendStatus(200);
});

app.listen(PORT, '0.0.0.0', async () => {
  await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${BASE_URL}/webhook`
    })
  });
});
