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

const DATA_DIR = path.join(__dirname, 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(COMMENTS_FILE)) fs.writeFileSync(COMMENTS_FILE, '[]');

const readComments = () => {
    try {
        return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
    } catch {
        return [];
    }
};

const writeComments = (comments) => {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
};

const storage = {
    pendingComments: new Map(),
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

const telegramEdit = async (id, text) => {
    if (!TELEGRAM_API || !ADMIN_CHAT_ID) return;
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
    if (!TELEGRAM_API) return;
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: id })
    });
};

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.post('/submit-comment', async (req, res) => {
    const { name, text, clientId } = req.body || {};
    if (!text || !clientId) {
        return res.status(400).json({ error: 'invalid data' });
    }

    const ipHash = hashIP(getClientIP(req));
    if (storage.ipTracking.get(ipHash) === 'approved') {
        return res.status(403).json({ error: 'already approved' });
    }

    const id = generateId();

    const comment = {
        commentId: id,
        displayName: name?.trim() ? sanitize(name) : generateName(),
        text: sanitize(text),
        ipHash,
        timestamp: Date.now()
    };

    storage.pendingComments.set(id, comment);
    storage.ipTracking.set(ipHash, 'pending');

    const keyboard = [[
        { text: '✅ موافقة', callback_data: `approve_${id}` },
        { text: '❌ رفض', callback_data: `reject_${id}` }
    ]];

    await telegramSend(
        `🆕 تعليق جديد\n\n👤 ${comment.displayName}\n💬 ${comment.text}\n🆔 ${id}`,
        keyboard
    );

    res.json({ success: true, commentId: id });
});

app.get('/comments', (req, res) => {
    res.json(readComments());
});

app.post('/webhook', async (req, res) => {
    const q = req.body?.callback_query;
    if (!q) return res.sendStatus(200);

    const [action, id] = q.data.split('_');
    const comment = storage.pendingComments.get(id);
    if (!comment) {
        await telegramAnswer(q.id);
        return res.sendStatus(200);
    }

    if (action === 'approve') {
        const comments = readComments();
        comments.push(comment);
        writeComments(comments);
        storage.ipTracking.set(comment.ipHash, 'approved');
        await telegramEdit(
            q.message.message_id,
            `✅ تم القبول\n\n👤 ${comment.displayName}\n💬 ${comment.text}`
        );
    }

    if (action === 'reject') {
        storage.ipTracking.delete(comment.ipHash);
        await telegramEdit(
            q.message.message_id,
            `❌ تم الرفض\n\n👤 ${comment.displayName}\n💬 ${comment.text}`
        );
    }

    storage.pendingComments.delete(id);
    await telegramAnswer(q.id);
    res.sendStatus(200);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server started on port', PORT);
});
