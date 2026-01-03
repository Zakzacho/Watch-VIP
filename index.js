const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// قاعدة بيانات بسيطة في الذاكرة
let comments = [];
let pendingComments = new Map(); // commentId -> comment data
let ipComments = new Map(); // ip -> comment
let verifiedAccountCounter = 0;

// معلومات البوت
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// دالة لإرسال رسالة إلى تيليغرام
async function sendToTelegram(text, buttons = null) {
    try {
        const payload = {
            chat_id: ADMIN_CHAT_ID,
            text: text,
            parse_mode: 'HTML'
        };

        if (buttons) {
            payload.reply_markup = {
                inline_keyboard: buttons
            };
        }

        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
        return response.data;
    } catch (error) {
        console.error('خطأ في إرسال رسالة تيليغرام:', error.response?.data || error.message);
        throw error;
    }
}

// دالة للرد على Callback Query
async function answerCallbackQuery(callbackQueryId, text) {
    try {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: callbackQueryId,
            text: text
        });
    } catch (error) {
        console.error('خطأ في الرد على Callback Query:', error.message);
    }
}

// دالة لتحديث رسالة في تيليغرام
async function editTelegramMessage(messageId, text) {
    try {
        await axios.post(`${TELEGRAM_API}/editMessageText`, {
            chat_id: ADMIN_CHAT_ID,
            message_id: messageId,
            text: text,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('خطأ في تحديث الرسالة:', error.message);
    }
}

// إنشاء معرف فريد للتعليق
function generateCommentId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'Backend Server for Video Player',
        endpoints: {
            'POST /submit-comment': 'Submit a new comment',
            'GET /comments': 'Get all approved comments',
            'POST /check-comment': 'Check if user has commented',
            'POST /delete-comment': 'Delete user comment',
            'POST /webhook': 'Telegram webhook'
        }
    });
});

// استقبال تعليق جديد
app.post('/submit-comment', async (req, res) => {
    try {
        const { name, text, ip } = req.body;

        if (!text || !ip) {
            return res.status(400).json({
                success: false,
                message: 'البيانات غير مكتملة'
            });
        }

        // التحقق من وجود تعليق سابق لنفس IP
        if (ipComments.has(ip)) {
            return res.status(400).json({
                success: false,
                message: 'لديك تعليق بالفعل. احذفه أولاً للتعليق مرة أخرى.'
            });
        }

        const commentId = generateCommentId();
        let assignedName = name;
        let isVerified = false;

        // إذا لم يدخل المستخدم اسماً، يتم تعيين حساب موثق
        if (!name || name.trim() === '') {
            verifiedAccountCounter++;
            assignedName = `حساب موثق رقم ${verifiedAccountCounter}`;
            isVerified = true;
        }

        const commentData = {
            id: commentId,
            name: assignedName,
            text: text,
            ip: ip,
            verified: isVerified,
            date: new Date().toISOString()
        };

        // حفظ التعليق المعلق
        pendingComments.set(commentId, commentData);

        // إرسال التعليق إلى المشرف عبر تيليغرام
        const message = `
📩 <b>تعليق جديد</b>

👤 الاسم: ${assignedName}
${isVerified ? '✅ حساب موثق' : ''}
💬 التعليق: ${text}
🌐 IP: ${ip}
🕒 التاريخ: ${new Date().toLocaleString('ar-EG')}
        `.trim();

        const buttons = [
            [
                { text: '✅ موافقة', callback_data: `approve_${commentId}` },
                { text: '❌ رفض', callback_data: `reject_${commentId}` }
            ]
        ];

        await sendToTelegram(message, buttons);

        res.json({
            success: true,
            message: 'تم إرسال التعليق للمراجعة',
            assignedName: assignedName
        });

    } catch (error) {
        console.error('خطأ في استقبال التعليق:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم'
        });
    }
});

// الحصول على جميع التعليقات المعتمدة
app.get('/comments', (req, res) => {
    res.json({
        success: true,
        comments: comments
    });
});

// التحقق من وجود تعليق للمستخدم
app.post('/check-comment', (req, res) => {
    const { ip } = req.body;

    if (ipComments.has(ip)) {
        res.json({
            success: true,
            hasComment: true,
            comment: ipComments.get(ip)
        });
    } else {
        res.json({
            success: true,
            hasComment: false
        });
    }
});

// حذف تعليق المستخدم
app.post('/delete-comment', (req, res) => {
    const { ip } = req.body;

    if (!ipComments.has(ip)) {
        return res.status(400).json({
            success: false,
            message: 'لا يوجد تعليق لحذفه'
        });
    }

    const comment = ipComments.get(ip);
    
    // حذف من القائمة الرئيسية
    comments = comments.filter(c => c.ip !== ip);
    
    // حذف من خريطة IP
    ipComments.delete(ip);

    res.json({
        success: true,
        message: 'تم حذف التعليق بنجاح'
    });
});

// Webhook لاستقبال تحديثات تيليغرام
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;

        // معالجة Callback Query
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const data = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;

            const [action, commentId] = data.split('_');

            if (!pendingComments.has(commentId)) {
                await answerCallbackQuery(callbackQuery.id, 'التعليق غير موجود أو تمت معالجته');
                return res.sendStatus(200);
            }

            const comment = pendingComments.get(commentId);

            if (action === 'approve') {
                // الموافقة على التعليق
                comments.push(comment);
                ipComments.set(comment.ip, comment);
                pendingComments.delete(commentId);

                await answerCallbackQuery(callbackQuery.id, '✅ تمت الموافقة على التعليق');
                await editTelegramMessage(messageId, `
✅ <b>تمت الموافقة</b>

👤 الاسم: ${comment.name}
💬 التعليق: ${comment.text}
🕒 ${new Date().toLocaleString('ar-EG')}
                `.trim());

            } else if (action === 'reject') {
                // رفض التعليق
                pendingComments.delete(commentId);

                await answerCallbackQuery(callbackQuery.id, '❌ تم رفض التعليق');
                await editTelegramMessage(messageId, `
❌ <b>تم الرفض</b>

👤 الاسم: ${comment.name}
💬 التعليق: ${comment.text}
🕒 ${new Date().toLocaleString('ar-EG')}
                `.trim());
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('خطأ في معالجة Webhook:', error);
        res.sendStatus(500);
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 Webhook URL: https://watch-vip.onrender.com/webhook`);
});
