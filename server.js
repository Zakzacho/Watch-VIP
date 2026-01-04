const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '';
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

/* ================= STORAGE FILE ================= */

const DATA_DIR = path.join(__dirname, 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(COMMENTS_FILE)) fs.writeFileSync(COMMENTS_FILE, '[]');
if (!fs.existsSync(PENDING_FILE)) fs.writeFileSync(PENDING_FILE, '{}');

const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

/* ================= UTILS ================= */

const hashIP = ip =>
  crypto.createHash('sha256').update(ip).digest('hex');

const getClientIP = req =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket.remoteAddress ||
  req.ip;

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const generateName = () =>
  `حساب موثق رقم ${Math.floor(Math.random() * 9999) + 1}`;

const sanitize = text =>
  String(text || '').replace(/[<>]/g, '').trim();

/* ================= TELEGRAM ================= */

const telegramSend = async (text, keyboard) => {
  if (!TELEGRAM_API || !ADMIN_CHAT_ID) return;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    })
  });
};

const telegramEdit = async (messageId, text) => {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      message_id: messageId,
      text,
      parse_mode: 'HTML'
    })
  });
};

const telegramAnswer = async id => {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id })
  });
};

/* ================= ROUTES ================= */

app.get('/health', (_, res) => {
  res.json({ status: 'healthy' });
});

app.post('/submit-comment', async (req, res) => {
  const { name, text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'invalid data' });

  const ipHash = hashIP(getClientIP(req));
  const pending = readJSON(PENDING_FILE);

  if (Object.values(pending).some(c => c.ipHash === ipHash)) {
    return res.status(403).json({ error: 'already submitted' });
  }

  const id = generateId();

  const comment = {
    id,
    name: name?.trim() ? sanitize(name) : generateName(),
    text: sanitize(text),
    ipHash,
    time: Date.now()
  };

  pending[id] = comment;
  writeJSON(PENDING_FILE, pending);

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
  res.json({ success: true });
});

app.get('/comments', (_, res) => {
  res.json(readJSON(COMMENTS_FILE));
});

app.post('/webhook', async (req, res) => {
  const q = req.body?.callback_query;
  if (!q) return res.sendStatus(200);

  await telegramAnswer(q.id);

  const [action, id] = q.data.split('_');
  const pending = readJSON(PENDING_FILE);
  const approved = readJSON(COMMENTS_FILE);

  const comment = pending[id];
  if (!comment) return res.sendStatus(200);

  if (action === 'approve') {
    approved.push(comment);
    writeJSON(COMMENTS_FILE, approved);

    await telegramEdit(
      q.message.message_id,
      `✅ تم القبول\n\n👤 ${comment.name}\n💬 ${comment.text}`
    );
  }

  if (action === 'reject') {
    await telegramEdit(
      q.message.message_id,
      `❌ تم الرفض\n\n👤 ${comment.name}\n💬 ${comment.text}`
    );
  }

  delete pending[id];
  writeJSON(PENDING_FILE, pending);

  res.sendStatus(200);
});

/* ================= START ================= */

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server started on port', PORT);
});
