require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();

const PORT = parseInt(process.env.PORT) || 3000;
console.log('🔍 Using PORT:', PORT);
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const BASE_URL = process.env.BASE_URL || 'https://site--watch-vip--j9hb6dlmp4qm.code.run';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// التحقق من المتغيرات البيئية
if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.error('❌ Missing BOT_TOKEN or ADMIN_CHAT_ID');
    process.exit(1);
}

// CORS Configuration - مهم جداً!
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// نظام التخزين في الذاكرة
const storage = {
    pendingComments: new Map(),
    approvedComments: [],
    ipTracking: new Map()
};

// دوال مساعدة
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
    text.replace(/[<>]/g, '').trim();

// دوال Telegram
const telegramSend = async (text, keyboard) => {
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
            console.error('❌ Telegram send error:', j);
        }
        return j.ok ? j.result.message_id : null;
    } catch (error) {
        console.error('❌ Error sending telegram message:', error);
        return null;
    }
};

const telegramEdit = async (id, text) => {
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
    } catch (error) {
        console.error('❌ Error editing telegram message:', error);
    }
};

const telegramAnswer = async (id, text) => {
    try {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: id,
                text
            })
        });
    } catch (error) {
        console.error('❌ Error answering callback:', error);
    }
};

// Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        public: BASE_URL,
        endpoints: {
            'POST /submit-comment': 'Submit a new comment',
            'GET /comments': 'Get approved comments',
            'POST /webhook': 'Telegram webhook',
            'GET /setup-webhook': 'Setup telegram webhook',
            'GET /webhook-info': 'Get webhook info',
            'GET /stats': 'Get statistics',
            'GET /health': 'Health check'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// إعداد webhook
app.get('/setup-webhook', async (req, res) => {
    const webhookUrl = `${BASE_URL}/webhook`;
    
    try {
        console.log('⚙️ Setting up webhook:', webhookUrl);
        const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: webhookUrl,
                drop_pending_updates: true
            })
        });
        
        const data = await response.json();
        console.log('📱 Webhook setup result:', data);
        
        res.json({ 
            success: data.ok, 
            data,
            webhook_url: webhookUrl 
        });
    } catch (error) {
        console.error('❌ Error setting up webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// التحقق من حالة webhook
app.get('/webhook-info', async (req, res) => {
    try {
        const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ Error getting webhook info:', error);
        res.status(500).json({ error: error.message });
    }
});

// إحصائيات النظام
app.get('/stats', (req, res) => {
    res.json({
        pending: storage.pendingComments.size,
        approved: storage.approvedComments.length,
        ipTracking: storage.ipTracking.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// إرسال تعليق جديد
app.post('/submit-comment', async (req, res) => {
    try {
        const { name, text, clientId } = req.body;

        console.log('📝 Comment submission:', { 
            name: name || 'anonymous', 
            textLength: text?.length,
            clientId,
            ip: getClientIP(req)
        });

        if (!text || !clientId) {
            console.log('⚠️ Invalid data - missing text or clientId');
            return res.status(400).json({ 
                error: 'invalid data',
                message: 'النص و معرف العميل مطلوبان'
            });
        }

        if (text.length > 500) {
            return res.status(400).json({
                error: 'text too long',
                message: 'التعليق طويل جداً'
            });
        }

        const ipHash = hashIP(getClientIP(req));
        const existing = storage.ipTracking.get(ipHash);

        if (existing?.status === 'approved') {
            console.log('⚠️ IP already has approved comment:', ipHash.slice(0, 8));
            return res.status(403).json({ 
                error: 'already approved',
                message: 'لديك تعليق مقبول بالفعل'
            });
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

👤 الاسم: ${comment.name}
💬 النص: ${comment.text}
🆔 المعرف: ${id}
⏰ الوقت: ${new Date(comment.time).toLocaleString('ar-EG')}
`.trim();

        const keyboard = [[
            { text: '✅ موافقة', callback_data: `approve_${id}` },
            { text: '❌ رفض', callback_data: `reject_${id}` }
        ]];

        const msgId = await telegramSend(message, keyboard);
        
        if (!msgId) {
            console.error('❌ Failed to send telegram message');
            throw new Error('فشل إرسال الإشعار');
        }

        console.log('✅ Comment submitted successfully:', id);

        res.json({ 
            success: true, 
            commentId: id,
            message: 'تم إرسال تعليقك للمراجعة'
        });
    } catch (error) {
        console.error('❌ Error in submit-comment:', error);
        res.status(500).json({ 
            error: 'server error', 
            message: 'خطأ في الخادم',
            details: error.message 
        });
    }
});

// الحصول على التعليقات المعتمدة
app.get('/comments', (req, res) => {
    try {
        const comments = storage.approvedComments.map(c => ({
            commentId: c.id,
            displayName: c.name,
            text: c.text,
            timestamp: c.time
        }));
        
        console.log(`📋 Returning ${comments.length} approved comments`);
        res.json(comments);
    } catch (error) {
        console.error('❌ Error getting comments:', error);
        res.status(500).json({ 
            error: 'server error',
            message: 'خطأ في تحميل التعليقات'
        });
    }
});

// معالج webhook من Telegram
app.post('/webhook', async (req, res) => {
    try {
        console.log('📨 Webhook received');
        
        const q = req.body.callback_query;
        if (!q) {
            console.log('⚠️ No callback_query in webhook');
            return res.sendStatus(200);
        }

        const [action, id] = q.data.split('_');
        const comment = storage.pendingComments.get(id);

        if (!comment) {
            console.log('⚠️ Comment not found:', id);
            await telegramAnswer(q.id, 'التعليق تمت معالجته مسبقاً');
            return res.sendStatus(200);
        }

        if (action === 'approve') {
            comment.status = 'approved';
            storage.approvedComments.push(comment);
            storage.ipTracking.set(comment.ipHash, { id, status: 'approved' });
            
            await telegramEdit(
                q.message.message_id, 
                `✅ تم القبول\n\n👤 ${comment.name}\n💬 ${comment.text}`
            );
            
            await telegramAnswer(q.id, '✅ تم قبول التعليق');
            console.log('✅ Comment approved:', id);
            
        } else if (action === 'reject') {
            storage.ipTracking.delete(comment.ipHash);
            
            await telegramEdit(
                q.message.message_id, 
                `❌ تم الرفض\n\n👤 ${comment.name}\n💬 ${comment.text}`
            );
            
            await telegramAnswer(q.id, '❌ تم رفض التعليق');
            console.log('❌ Comment rejected:', id);
        }

        storage.pendingComments.delete(id);
        res.sendStatus(200);
        
    } catch (error) {
        console.error('❌ Error in webhook handler:', error);
        res.sendStatus(500);
    }
});

// معالج 404
app.use((req, res) => {
    console.log('⚠️ 404:', req.path);
    res.status(404).json({ 
        error: 'not found',
        path: req.path 
    });
});

// معالج الأخطاء
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({
        error: 'internal server error',
        message: error.message
    });
});

// تشغيل السيرفر
app.listen(PORT, '0.0.0.0', async () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Server Started Successfully!');
    console.log('='.repeat(50));
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: ${BASE_URL}`);
    console.log(`📱 Bot Token: ${BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`👤 Admin ID: ${ADMIN_CHAT_ID || '❌ Missing'}`);
    console.log('='.repeat(50) + '\n');
    
    // محاولة إعداد webhook تلقائيًا
    try {
        console.log('⚙️ Setting up webhook...');
        const webhookUrl = `${BASE_URL}/webhook`;
        const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: webhookUrl,
                drop_pending_updates: true
            })
        });
        const data = await response.json();
        
        if (data.ok) {
            console.log('✅ Webhook setup successful');
            console.log(`📡 Webhook URL: ${webhookUrl}\n`);
        } else {
            console.log('⚠️ Webhook setup failed:', data.description);
        }
    } catch (error) {
        console.error('❌ Error setting up webhook:', error.message);
    }
});
