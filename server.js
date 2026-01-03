require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const BASE_URL = 'https://site--watch-vip--j9hb6dlmp4qm.code.run';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.error('Missing BOT_TOKEN or ADMIN_CHAT_ID');
    process.exit(1);
}

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
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
    req.socket.remoteAddress ||
    req.ip;

const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

const generateName = () =>
    `حساب موثق رقم ${Math.floor(Math.random() * 9999) + 1}`;

const sanitize = text =>
    text.replace(/[<>]/g, '').trim();

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

const telegramAnswer = async (id, text) => {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: id,
            text
        })
    });
};

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        public: BASE_URL
    });
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

    res.json({ success: true });
});

app.get('/comments', (req, res) => {
    res.json(
        storage.approvedComments.map(c => ({
            id: c.id,
            name: c.name,
            text: c.text,
            time: c.time
        }))
    );
});

app.post('/webhook', async (req, res) => {
    const q = req.body.callback_query;
    if (!q) return res.sendStatus(200);

    const [action, id] = q.data.split('_');
    const comment = storage.pendingComments.get(id);

    if (!comment) {
        await telegramAnswer(q.id, 'processed');
        return res.sendStatus(200);
    }

    if (action === 'approve') {
        comment.status = 'approved';
        storage.approvedComments.push(comment);
        storage.ipTracking.set(comment.ipHash, { id, status: 'approved' });
        await telegramEdit(q.message.message_id, `✅ تم القبول\n\n${comment.text}`);
    } else {
        storage.ipTracking.delete(comment.ipHash);
        await telegramEdit(q.message.message_id, `❌ تم الرفض\n\n${comment.text}`);
    }

    storage.pendingComments.delete(id);
    await telegramAnswer(q.id, 'done');

    res.sendStatus(200);
});

app.use((req, res) => {
    res.status(404).json({ error: 'not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Public URL: ${BASE_URL}`);
});
