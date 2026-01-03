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

const storage = {
    pendingComments: new Map(),
    approvedComments: [],
    ipTracking: new Map()
};

const Utils = {
    hashIP(ip) {
        return crypto.createHash('sha256').update(ip).digest('hex');
    },
    generateCommentId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    },
    generateVerifiedName() {
        return `حساب موثق رقم ${Math.floor(Math.random() * 9999) + 1}`;
    },
    sanitize(text) {
        return text.replace(/[<>]/g, '').trim();
    },
    getClientIP(req) {
        return (
            req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket.remoteAddress ||
            req.ip
        );
    }
};

const Telegram = {
    async send(text, keyboard) {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            })
        });
        const data = await res.json();
        return data.ok ? data.result.message_id : null;
    },

    async edit(messageId, text) {
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
    },

    async answer(callbackId, text) {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackId,
                text
            })
        });
    }
};

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        backend: BASE_URL,
        endpoints: ['/submit-comment', '/comments', '/webhook']
    });
});

app.post('/submit-comment', async (req, res) => {
    const { name, text, clientId } = req.body;
    if (!text || !clientId) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const ipHash = Utils.hashIP(Utils.getClientIP(req));
    const existing = storage.ipTracking.get(ipHash);

    if (existing && existing.status === 'approved') {
        return res.status(403).json({ error: 'Already commented' });
    }

    const commentId = Utils.generateCommentId();
    const comment = {
        commentId,
        text: Utils.sanitize(text),
        displayName: name?.trim()
            ? Utils.sanitize(name)
            : Utils.generateVerifiedName(),
        ipHash,
        clientId,
        timestamp: Date.now(),
        status: 'pending'
    };

    storage.pendingComments.set(commentId, comment);
    storage.ipTracking.set(ipHash, { commentId, status: 'pending' });

    const message = `
🆕 <b>تعليق جديد</b>

👤 ${comment.displayName}
💬 ${comment.text}
🆔 ${comment.commentId}
🕒 ${new Date(comment.timestamp).toLocaleString('ar')}
`.trim();

    const keyboard = [[
        { text: '✅ موافقة', callback_data: `approve_${commentId}` },
        { text: '❌ رفض', callback_data: `reject_${commentId}` }
    ]];

    await Telegram.send(message, keyboard);

    res.json({ success: true, commentId });
});

app.get('/comments', (req, res) => {
    res.json(
        storage.approvedComments.map(c => ({
            commentId: c.commentId,
            text: c.text,
            displayName: c.displayName,
            timestamp: c.timestamp
        }))
    );
});

app.post('/webhook', async (req, res) => {
    const q = req.body.callback_query;
    if (!q) return res.sendStatus(200);

    const [action, commentId] = q.data.split('_');
    const comment = storage.pendingComments.get(commentId);

    if (!comment) {
        await Telegram.answer(q.id, 'Already handled');
        return res.sendStatus(200);
    }

    if (action === 'approve') {
        comment.status = 'approved';
        storage.approvedComments.push(comment);
        storage.ipTracking.set(comment.ipHash, {
            commentId,
            status: 'approved'
        });
    } else {
        storage.ipTracking.delete(comment.ipHash);
    }

    storage.pendingComments.delete(commentId);

    await Telegram.edit(
        q.message.message_id,
        `${action === 'approve' ? '✅ تم قبول التعليق' : '❌ تم رفض التعليق'}\n\n${comment.text}`
    );

    await Telegram.answer(q.id, 'OK');
    res.sendStatus(200);
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Public URL: ${BASE_URL}`);
});
