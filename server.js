const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();

/* ================= ENV ================= */
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const BASE_URL = process.env.BASE_URL; // مثال: https://site--watch-vip--xxxx.code.run
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/* ================= CHECK ================= */
if (!BOT_TOKEN || !ADMIN_CHAT_ID || !BASE_URL) {
    console.error('❌ Missing ENV variables');
    process.exit(1);
}

/* ================= MIDDLEWARE ================= */
app.use(cors({ origin: '*', methods: ['GET','POST'] }));
app.use(express.json());

/* ================= STORAGE ================= */
const storage = {
    pending: new Map(),
    approved: [],
    ipMap: new Map()
};

/* ================= HELPERS ================= */
const hashIP = ip =>
    crypto.createHash('sha256').update(ip).digest('hex');

const getIP = req =>
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress ||
    req.ip;

const id = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

const autoName = () =>
    `حساب موثق رقم ${Math.floor(Math.random() * 9000 + 1000)}`;

const clean = t =>
    String(t || '').replace(/[<>]/g, '').trim();

/* ================= TELEGRAM ================= */
async function tgSend(text, keyboard) {
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
}

async function tgEdit(msgId, text) {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            message_id: msgId,
            text,
            parse_mode: 'HTML'
        })
    });
}

async function tgAnswer(cbId) {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cbId })
    });
}

/* ================= ROUTES ================= */
app.get('/', (_, res) => {
    res.json({ ok: true, service: 'watch-vip-backend' });
});

app.get('/health', (_, res) => {
    res.json({ status: 'healthy' });
});

/* ===== SUBMIT COMMENT ===== */
app.post('/submit-comment', async (req, res) => {
    const { name, text, clientId } = req.body;
    if (!text || !clientId) {
        return res.status(400).json({ error: 'invalid data' });
    }

    const ipHash = hashIP(getIP(req));
    if (storage.ipMap.get(ipHash) === 'approved') {
        return res.status(403).json({ error: 'already commented' });
    }

    const cid = id();
    const comment = {
        id: cid,
        name: name?.trim() ? clean(name) : autoName(),
        text: clean(text),
        ipHash,
        time: Date.now()
    };

    storage.pending.set(cid, comment);
    storage.ipMap.set(ipHash, 'pending');

    await tgSend(
        `🆕 تعليق جديد\n\n👤 ${comment.name}\n💬 ${comment.text}`,
        [[
            { text: '✅ موافقة', callback_data: `ok_${cid}` },
            { text: '❌ رفض', callback_data: `no_${cid}` }
        ]]
    );

    res.json({ success: true });
});

/* ===== GET COMMENTS ===== */
app.get('/comments', (_, res) => {
    res.json(
        storage.approved.map(c => ({
            commentId: c.id,
            displayName: c.name,
            text: c.text,
            timestamp: c.time
        }))
    );
});

/* ===== TELEGRAM WEBHOOK ===== */
app.post('/webhook', async (req, res) => {
    const q = req.body?.callback_query;
    if (!q) return res.sendStatus(200);

    await tgAnswer(q.id);

    const [action, cid] = q.data.split('_');
    const comment = storage.pending.get(cid);
    if (!comment) return res.sendStatus(200);

    if (action === 'ok') {
        storage.approved.push(comment);
        storage.ipMap.set(comment.ipHash, 'approved');
        await tgEdit(q.message.message_id, `✅ تم القبول\n\n${comment.text}`);
    }

    if (action === 'no') {
        storage.ipMap.delete(comment.ipHash);
        await tgEdit(q.message.message_id, `❌ تم الرفض\n\n${comment.text}`);
    }

    storage.pending.delete(cid);
    res.sendStatus(200);
});

/* ================= START ================= */
app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ Server running on port', PORT);
    console.log('🌐 Webhook URL:', `${BASE_URL}/webhook`);
});
