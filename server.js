const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();

// Configuration
const PORT = parseInt(process.env.PORT, 10) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '';
const BASE_URL = process.env.BASE_URL || 'https://site--watch-vip--j9hb6dlmp4qm.code.run';
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

// Middleware
app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'] 
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage
const storage = {
  pendingComments: new Map(),
  approvedComments: [],
  ipTracking: new Map()
};

// Helper Functions
const hashIP = (ip) => {
  return crypto.createHash('sha256').update(ip).digest('hex');
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.ip;
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

const generateName = () => {
  return `حساب موثق رقم ${Math.floor(Math.random() * 9999) + 1}`;
};

const sanitize = (text) => {
  return String(text || '').replace(/[<>]/g, '').trim();
};

// Telegram Functions
const telegramSend = async (text, keyboard) => {
  if (!TELEGRAM_API || !ADMIN_CHAT_ID) return null;
  
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      })
    });
    
    const json = await response.json();
    return json.ok ? json.result.message_id : null;
  } catch (error) {
    console.error('Telegram send error:', error);
    return null;
  }
};

const telegramEdit = async (messageId, text) => {
  if (!TELEGRAM_API || !ADMIN_CHAT_ID) return;
  
  try {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        message_id: messageId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Telegram edit error:', error);
  }
};

const telegramAnswer = async (callbackQueryId, text) => {
  if (!TELEGRAM_API) return;
  
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
      })
    });
  } catch (error) {
    console.error('Telegram answer error:', error);
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    uptime: process.uptime() 
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/submit-comment', async (req, res) => {
  try {
    const { name, text, clientId } = req.body || {};

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
      id: id,
      name: name?.trim() ? sanitize(name) : generateName(),
      text: sanitize(text),
      ipHash: ipHash,
      status: 'pending',
      time: Date.now()
    };

    storage.pendingComments.set(id, comment);
    storage.ipTracking.set(ipHash, { id: id, status: 'pending' });

    const message = `🆕 تعليق جديد

👤 ${comment.name}
💬 ${comment.text}
🆔 ${id}`;

    const keyboard = [[
      { text: '✅ موافقة', callback_data: `approve_${id}` },
      { text: '❌ رفض', callback_data: `reject_${id}` }
    ]];

    await telegramSend(message, keyboard);

    res.json({ 
      success: true, 
      commentId: id 
    });
  } catch (error) {
    console.error('Submit comment error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.get('/comments', (req, res) => {
  try {
    const comments = storage.approvedComments.map(comment => ({
      commentId: comment.id,
      displayName: comment.name,
      text: comment.text,
      timestamp: comment.time
    }));

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const callbackQuery = req.body?.callback_query;
    
    if (!callbackQuery) {
      return res.sendStatus(200);
    }

    const [action, id] = String(callbackQuery.data || '').split('_');
    const comment = storage.pendingComments.get(id);

    if (!comment) {
      await telegramAnswer(callbackQuery.id, 'processed');
      return res.sendStatus(200);
    }

    if (action === 'approve') {
      comment.status = 'approved';
      storage.approvedComments.push(comment);
      storage.ipTracking.set(comment.ipHash, { id: id, status: 'approved' });
      
      await telegramEdit(
        callbackQuery.message.message_id,
        `✅ تم القبول\n\n${comment.text}`
      );
    } else if (action === 'reject') {
      storage.ipTracking.delete(comment.ipHash);
      
      await telegramEdit(
        callbackQuery.message.message_id,
        `❌ تم الرفض\n\n${comment.text}`
      );
    }

    storage.pendingComments.delete(id);
    await telegramAnswer(callbackQuery.id, 'done');

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('Server started successfully');
  console.log('========================================');
  console.log(`PORT: ${PORT}`);
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`BOT_TOKEN: ${BOT_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`ADMIN_CHAT_ID: ${ADMIN_CHAT_ID || 'Not configured'}`);
  console.log('========================================');
});
