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

// مسار ملف البيانات
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'comments.json');

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تهيئة المخزن
const storage = {
    pendingComments: new Map(),
    approvedComments: [],
    ipTracking: new Map()
};

// 1. دالة لتهيئة الملفات وتحميل البيانات عند التشغيل
const initData = () => {
    // التأكد من وجود المجلد
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }
    // التأكد من وجود الملف وقراءة البيانات منه
    if (fs.existsSync(DATA_FILE)) {
        try {
            const fileData = fs.readFileSync(DATA_FILE, 'utf8');
            storage.approvedComments = JSON.parse(fileData);
            console.log(`✅ Loaded ${storage.approvedComments.length} comments from file.`);
        } catch (err) {
            console.error('Error reading comments file:', err);
            storage.approvedComments = [];
        }
    } else {
        // إنشاء ملف فارغ إذا لم يكن موجوداً
        fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
};

// 2. دالة لحفظ التعليقات المعتمدة في الملف
const saveData = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(storage.approvedComments, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving comments:', err);
    }
};

// استدعاء دالة التحميل عند بدء التشغيل
initData();

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
    if (!TELEGRAM_API || !ADMIN_CHAT_ID) return null;
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
        return j.ok ? j.result.message_id : null;
    } catch (e) {
        console.error('Telegram Send Error:', e);
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
    } catch (e) {
        console.error('Telegram Edit Error:', e);
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
    } catch (e) {
        console.error('Telegram Answer Error:', e);
    }
};

app.get('/', (req, res) => {
    res.json({ status: 'running', comments_count: storage.approvedComments.length });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.post('/submit-comment', async (req, res) => {
    const { name, text, clientId } = req.body || {};
    if (!text || !clientId) {
        return res.status(400).json({ error: 'invalid data' });
    }

    const ipHash = hashIP(getClientIP(req));
    // ملاحظة: تتبع IP هنا في الذاكرة فقط، سيتم إعادة تعيينه عند الريستارت
    // إذا كنت تريد حظر دائم يجب حفظه في ملف أيضاً
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
🆕 <b>تعليق جديد</b>

👤 ${comment.name}
💬 ${comment.text}
🆔 <code>${id}</code>
`.trim();

    const keyboard = [[
        { text: '✅ موافقة', callback_data: `approve_${id}` },
        { text: '❌ رفض', callback_data: `reject_${id}` }
    ]];

    await telegramSend(message, keyboard);
    res.json({ success: true, commentId: id });
});

app.get('/comments', (req, res) => {
    // إرجاع التعليقات المحملة من الملف والمخزنة في الذاكرة
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

    // الرد السريع لتجنب تعليق التليجرام
    await telegramAnswer(q.id);

    const dataParts = String(q.data || '').split('_');
    const action = dataParts[0];
    const id = dataParts[1];

    const comment = storage.pendingComments.get(id);
    
    // إذا لم يتم العثور على التعليق في الذاكرة (ربما بسبب إعادة تشغيل السيرفر)
    if (!comment) {
        await telegramEdit(
            q.message.message_id,
            `⚠️ <b>خطأ:</b> انتهت صلاحية هذا التعليق أو تم إعادة تشغيل الخادم.`
        );
        return res.sendStatus(200);
    }

    if (action === 'approve') {
        comment.status = 'approved';
        
        // 1. إضافة للمصفوفة
        storage.approvedComments.push(comment);
        
        // 2. تحديث التتبع
        storage.ipTracking.set(comment.ipHash, { id, status: 'approved' });
        
        // 3. حفظ التغييرات في الملف فوراً <--- هذا هو الجزء الأهم
        saveData();

        await telegramEdit(
            q.message.message_id,
            `✅ <b>تم القبول</b>\n\n👤 ${comment.name}\n💬 ${comment.text}`
        );
    }

    if (action === 'reject') {
        storage.ipTracking.delete(comment.ipHash);
        await telegramEdit(
            q.message.message_id,
            `❌ <b>تم الرفض</b>\n\n👤 ${comment.name}\n💬 ${comment.text}`
        );
    }

    storage.pendingComments.delete(id);
    res.sendStatus(200);
});

app.use((req, res) => {
    res.status(404).json({ error: 'not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server started on port', PORT);
});
