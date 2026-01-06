const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '';
const BASE_URL = process.env.BASE_URL || '';
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

// إعداد CORS بشكل صحيح
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// مسار ملف التعليقات
const DATA_DIR = path.join(__dirname, 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

// التخزين
const storage = {
    pendingComments: new Map(),
    approvedComments: [],
    ipTracking: new Map()
};

// دالة لتحميل التعليقات من الملف
async function loadComments() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const data = await fs.readFile(COMMENTS_FILE, 'utf8');
        storage.approvedComments = JSON.parse(data);
        console.log(`✅ تم تحميل ${storage.approvedComments.length} تعليق`);
    } catch (err) {
        if (err.code === 'ENOENT') {
            storage.approvedComments = [];
            await saveComments();
            console.log('✅ تم إنشاء ملف تعليقات جديد');
        } else {
            console.error('❌ خطأ في تحميل التعليقات:', err);
        }
    }
}

// دالة لحفظ التعليقات في الملف
async function saveComments() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(
            COMMENTS_FILE, 
            JSON.stringify(storage.approvedComments, null, 2),
            'utf8'
        );
        console.log('💾 تم حفظ التعليقات');
    } catch (err) {
        console.error('❌ خطأ في حفظ التعليقات:', err);
    }
}

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
    if (!TELEGRAM_API || !ADMIN_CHAT_ID) {
        console.log('⚠️ تكوين Telegram غير مكتمل');
        return null;
    }
    try {
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
        if (!j.ok) {
            console.error('❌ خطأ من Telegram:', j);
            return null;
        }
        return j.result.message_id;
    } catch (err) {
        console.error('❌ خطأ في إرسال رسالة Telegram:', err);
        return null;
    }
};

const telegramEdit = async (id, text) => {
    if (!TELEGRAM_API || !ADMIN_CHAT_ID) return;
    try {
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
    } catch (err) {
        console.error('❌ خطأ في تعديل رسالة:', err);
    }
};

const telegramAnswer = async (id, text = '') => {
    if (!TELEGRAM_API) return;
    try {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: id,
                text,
                show_alert: false
            })
        });
    } catch (err) {
        console.error('❌ خطأ في الرد على callback:', err);
    }
};

// إعداد Webhook عند بدء التشغيل
async function setupWebhook() {
    if (!TELEGRAM_API || !BASE_URL) {
        console.log('⚠️ لم يتم إعداد webhook - BASE_URL أو BOT_TOKEN مفقود');
        return;
    }
    
    const webhookUrl = `${BASE_URL}/webhook`;
    try {
        const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
        });
        const result = await response.json();
        if (result.ok) {
            console.log('✅ تم إعداد Webhook بنجاح:', webhookUrl);
        } else {
            console.error('❌ فشل إعداد Webhook:', result);
        }
    } catch (err) {
        console.error('❌ خطأ في إعداد Webhook:', err);
    }
}

app.get('/', (req, res) => {
    res.json({ 
        status: 'running', 
        uptime: process.uptime(),
        comments: storage.approvedComments.length,
        pending: storage.pendingComments.size
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        telegram: !!TELEGRAM_API,
        webhook: !!BASE_URL
    });
});

app.post('/submit-comment', async (req, res) => {
    console.log('📨 تعليق جديد مستلم');
    
    const { name, text, clientId } = req.body || {};
    if (!text || !clientId) {
        console.log('❌ بيانات غير صالحة');
        return res.status(400).json({ error: 'invalid data' });
    }

    const ipHash = hashIP(getClientIP(req));
    const existing = storage.ipTracking.get(ipHash);
    if (existing?.status === 'approved') {
        console.log('⚠️ IP لديه تعليق معتمد بالفعل');
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

    const sent = await telegramSend(message, keyboard);
    console.log(sent ? '✅ تم إرسال التعليق للبوت' : '❌ فشل إرسال التعليق للبوت');
    
    res.json({ success: true, commentId: id });
});

app.get('/comments', (req, res) => {
    console.log(`📋 طلب التعليقات: ${storage.approvedComments.length} تعليق`);
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
    console.log('🔔 Webhook استلم:', JSON.stringify(req.body, null, 2));
    
    const q = req.body?.callback_query;
    if (!q) {
        console.log('⚠️ ليس callback query');
        return res.sendStatus(200);
    }

    await telegramAnswer(q.id);

    const [action, id] = String(q.data || '').split('_');
    const comment = storage.pendingComments.get(id);
    
    if (!comment) {
        console.log('❌ التعليق غير موجود:', id);
        return res.sendStatus(200);
    }

    if (action === 'approve') {
        console.log('✅ تمت الموافقة على التعليق:', id);
        comment.status = 'approved';
        storage.approvedComments.push(comment);
        storage.ipTracking.set(comment.ipHash, { id, status: 'approved' });
        await saveComments();
        await telegramEdit(
            q.message.message_id,
            `✅ تم القبول\n\n👤 ${comment.name}\n💬 ${comment.text}`
        );
    }

    if (action === 'reject') {
        console.log('❌ تم رفض التعليق:', id);
        storage.ipTracking.delete(comment.ipHash);
        await telegramEdit(
            q.message.message_id,
            `❌ تم الرفض\n\n👤 ${comment.name}\n💬 ${comment.text}`
        );
    }

    storage.pendingComments.delete(id);
    res.sendStatus(200);
});

app.use((req, res) => {
    res.status(404).json({ error: 'not found' });
});

// بدء التشغيل
(async () => {
    await loadComments();
    await setupWebhook();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log('🚀 السيرفر يعمل على المنفذ', PORT);
        console.log('🤖 BOT_TOKEN:', BOT_TOKEN ? '✅ موجود' : '❌ مفقود');
        console.log('💬 ADMIN_CHAT_ID:', ADMIN_CHAT_ID ? '✅ موجود' : '❌ مفقود');
        console.log('🌐 BASE_URL:', BASE_URL ? '✅ موجود' : '❌ مفقود');
    });
})();
