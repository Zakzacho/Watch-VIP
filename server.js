<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="مشغل فيديو احترافي مع نظام تعليقات مباشر">
    <title>Watch VIP - مشغل الفيديو</title>
    
    <style>
        /* ===========================
           إعادة تعيين وتنسيقات عامة
        =========================== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: #ff0000;
            --secondary-color: #282828;
            --bg-dark: #0f0f0f;
            --bg-light: #1f1f1f;
            --text-primary: #ffffff;
            --text-secondary: #aaaaaa;
            --border-color: #303030;
            --success-color: #00ff00;
            --verified-color: #1da1f2;
            --shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }

        /* ===========================
           حاوية رئيسية
        =========================== */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* ===========================
           قسم مشغل الفيديو
        =========================== */
        .video-section {
            background: var(--bg-light);
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 30px;
            box-shadow: var(--shadow);
        }

        .video-header {
            padding: 15px 20px;
            background: var(--secondary-color);
            border-bottom: 1px solid var(--border-color);
        }

        .video-header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }

        .video-container {
            position: relative;
            padding-bottom: 56.25%;
            height: 0;
            overflow: hidden;
            background: #000;
        }

        .video-container iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }

        .video-info {
            padding: 20px;
        }

        .video-title {
            font-size: 1.3rem;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .video-description {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        /* ===========================
           قسم التعليقات
        =========================== */
        .comments-section {
            background: var(--bg-light);
            border-radius: 12px;
            padding: 20px;
            box-shadow: var(--shadow);
        }

        .comments-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--border-color);
        }

        .comments-header h2 {
            font-size: 1.4rem;
            font-weight: 600;
        }

        .comments-count {
            background: var(--secondary-color);
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        /* نموذج إضافة تعليق */
        .comment-form {
            margin-bottom: 30px;
            padding: 20px;
            background: var(--secondary-color);
            border-radius: 8px;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px 15px;
            background: var(--bg-dark);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.95rem;
            font-family: inherit;
            transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary-color);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 100px;
        }

        .form-hint {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-top: 5px;
        }

        .submit-btn {
            width: 100%;
            padding: 12px;
            background: var(--primary-color);
            color: var(--text-primary);
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.3s;
        }

        .submit-btn:hover {
            opacity: 0.9;
        }

        .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* رسائل الحالة */
        .status-message {
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 0.9rem;
            display: none;
        }

        .status-message.show {
            display: block;
        }

        .status-message.success {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid var(--success-color);
            color: var(--success-color);
        }

        .status-message.error {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid var(--primary-color);
            color: var(--primary-color);
        }

        .status-message.info {
            background: rgba(29, 161, 242, 0.1);
            border: 1px solid var(--verified-color);
            color: var(--verified-color);
        }

        /* قائمة التعليقات */
        .comments-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .comment-item {
            background: var(--secondary-color);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            transition: all 0.3s;
            cursor: pointer;
        }

        .comment-item:hover {
            border-color: var(--text-secondary);
        }

        .comment-item.user-comment {
            border: 2px solid var(--primary-color);
            background: rgba(255, 0, 0, 0.05);
        }

        .comment-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .comment-author {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 0.95rem;
        }

        .verified-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--verified-color);
            font-size: 0.85rem;
        }

        .verified-icon {
            width: 16px;
            height: 16px;
            fill: var(--verified-color);
        }

        .comment-time {
            color: var(--text-secondary);
            font-size: 0.85rem;
        }

        .comment-text {
            color: var(--text-primary);
            line-height: 1.6;
            word-wrap: break-word;
        }

        .comment-actions {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid var(--border-color);
            font-size: 0.85rem;
            color: var(--text-secondary);
        }

        .click-count {
            font-weight: 500;
        }

        .no-comments {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary);
        }

        /* ===========================
           تصميم متجاوب
        =========================== */
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }

            .video-header h1 {
                font-size: 1.2rem;
            }

            .video-title {
                font-size: 1.1rem;
            }

            .comments-header h2 {
                font-size: 1.2rem;
            }

            .comment-form {
                padding: 15px;
            }
        }

        /* ===========================
           أنيميشن
        =========================== */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .comment-item {
            animation: fadeIn 0.3s ease-out;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- قسم الفيديو -->
        <div class="video-section">
            <div class="video-header">
                <h1>🎬 Watch VIP</h1>
            </div>
            <div class="video-container" id="videoContainer">
                <!-- سيتم إدراج الفيديو هنا -->
            </div>
            <div class="video-info">
                <h2 class="video-title" id="videoTitle">مشغل الفيديو</h2>
                <p class="video-description" id="videoDescription">شاهد الفيديو المفضل لديك دون إعلانات</p>
            </div>
        </div>

        <!-- قسم التعليقات -->
        <div class="comments-section">
            <div class="comments-header">
                <h2>💬 التعليقات</h2>
                <span class="comments-count" id="commentsCount">0 تعليق</span>
            </div>

            <!-- رسالة الحالة -->
            <div class="status-message" id="statusMessage"></div>

            <!-- نموذج إضافة تعليق -->
            <div class="comment-form">
                <form id="commentForm">
                    <div class="form-group">
                        <label for="commentName">الاسم (اختياري)</label>
                        <input 
                            type="text" 
                            id="commentName" 
                            placeholder="اترك فارغاً لتوليد اسم تلقائي"
                            maxlength="50"
                        >
                        <div class="form-hint">سيتم توليد اسم بصيغة "حساب موثق رقم X" إذا تركت الحقل فارغاً</div>
                    </div>
                    <div class="form-group">
                        <label for="commentText">التعليق *</label>
                        <textarea 
                            id="commentText" 
                            placeholder="اكتب تعليقك هنا..."
                            required
                            maxlength="500"
                        ></textarea>
                    </div>
                    <button type="submit" class="submit-btn" id="submitBtn">نشر التعليق</button>
                </form>
            </div>

            <!-- قائمة التعليقات -->
            <div id="commentsListContainer">
                <div class="loading">جاري تحميل التعليقات...</div>
            </div>
        </div>
    </div>
<script>
const CONFIG = {
    BACKEND_URL: 'https://site--watch-vip--j9hb6dlmp4qm.code.run',
    REFRESH_INTERVAL: 10000,
    DOUBLE_CLICK_TIMEOUT: 500
};

const Utils = {
    sanitize(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    },
    timeAgo(ts) {
        const diff = Date.now() - ts;
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'الآن';
        if (m < 60) return `منذ ${m} دقيقة`;
        const h = Math.floor(m / 60);
        if (h < 24) return `منذ ${h} ساعة`;
        return `منذ ${Math.floor(h / 24)} يوم`;
    },
    clientId() {
        let id = localStorage.getItem('watch_vip_client_id');
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).slice(2);
            localStorage.setItem('watch_vip_client_id', id);
        }
        return id;
    },
    status(msg, type='info') {
        const el = document.getElementById('statusMessage');
        el.textContent = msg;
        el.className = `status-message ${type} show`;
        setTimeout(()=>el.classList.remove('show'), 4000);
    }
};

const API = {
    async submit(name, text) {
        const r = await fetch(`${CONFIG.BACKEND_URL}/submit-comment`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                name, text,
                clientId: Utils.clientId()
            })
        });
        if (!r.ok) throw new Error('فشل الإرسال');
        return r.json();
    },
    async comments() {
        const r = await fetch(`${CONFIG.BACKEND_URL}/comments`);
        return r.ok ? r.json() : [];
    }
};

const Comments = {
    userCommentId: localStorage.getItem('watch_vip_user_comment_id'),

    async init() {
        document.getElementById('commentForm')
            .addEventListener('submit', e => {
                e.preventDefault();
                this.send();
            });

        await this.load();
        setInterval(()=>this.load(), CONFIG.REFRESH_INTERVAL);
    },

    async send() {
        if (this.userCommentId) {
            Utils.status('لديك تعليق قيد المعالجة أو معتمد', 'info');
            return;
        }

        const name = commentName.value.trim();
        const text = commentText.value.trim();
        if (!text) return Utils.status('اكتب تعليقًا', 'error');

        try {
            const res = await API.submit(name || null, text);
            this.userCommentId = res.commentId;
            localStorage.setItem('watch_vip_user_comment_id', res.commentId);
            Utils.status('تم الإرسال بانتظار الموافقة', 'success');
            commentText.value = '';
        } catch {
            Utils.status('تعذر الإرسال', 'error');
        }
    },

    async load() {
        const list = await API.comments();
        const box = document.getElementById('commentsListContainer');

        if (!list.length) {
            box.innerHTML = '<div class="no-comments">لا توجد تعليقات</div>';
            return;
        }

        // إن لم يكن تعليق المستخدم موجودًا فعليًا → فك القفل
        if (this.userCommentId && !list.some(c => c.commentId === this.userCommentId)) {
            localStorage.removeItem('watch_vip_user_comment_id');
            this.userCommentId = null;
        }

        // تثبيت تعليق المستخدم أعلى
        list.sort((a,b)=>{
            if (a.commentId === this.userCommentId) return -1;
            if (b.commentId === this.userCommentId) return 1;
            return b.timestamp - a.timestamp;
        });

        box.innerHTML = `
            <div class="comments-list">
                ${list.map(c=>`
                    <div class="comment-item ${c.commentId===this.userCommentId?'user-comment':''}"
                         data-id="${c.commentId}">
                        <div class="comment-header">
                            <b>${Utils.sanitize(c.displayName)}</b>
                            <span>${Utils.timeAgo(c.timestamp)}</span>
                        </div>
                        <div>${Utils.sanitize(c.text)}</div>
                    </div>
                `).join('')}
            </div>
        `;

        this.bindClicks();
    },

    bindClicks() {
        document.querySelectorAll('.user-comment').forEach(el=>{
            let last = 0;
            el.onclick = () => {
                const now = Date.now();
                if (now - last < CONFIG.DOUBLE_CLICK_TIMEOUT) {
                    localStorage.removeItem('watch_vip_user_comment_id');
                    this.userCommentId = null;
                    Utils.status('يمكنك التعليق مجددًا', 'success');
                }
                last = now;
            };
        });
    }
};

document.addEventListener('DOMContentLoaded', ()=>Comments.init());
</script>
</body>
</html>
هذا كود موقع
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '';
const BASE_URL = process.env.BASE_URL || '';
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.options('*', cors());
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

const telegramAnswer = async (id, text = '') => {
    if (!TELEGRAM_API) return;
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: id,
            text,
            show_alert: false
        })
    });
};

app.get('/', (req, res) => {
    res.json({ status: 'running', uptime: process.uptime() });
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
    res.json({ success: true, commentId: id });
});

app.get('/comments', (req, res) => {
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

    await telegramAnswer(q.id);

    const [action, id] = String(q.data || '').split('_');
    const comment = storage.pendingComments.get(id);
    if (!comment) return res.sendStatus(200);

    if (action === 'approve') {
        comment.status = 'approved';
        storage.approvedComments.push(comment);
        storage.ipTracking.set(comment.ipHash, { id, status: 'approved' });
        await telegramEdit(
            q.message.message_id,
            `✅ تم القبول\n\n👤 ${comment.name}\n💬 ${comment.text}`
        );
    }

    if (action === 'reject') {
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

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server started on port', PORT);
});
وهذا كود البوت
{
  "name": "watch-vip",
  "version": "1.0.0",
  "description": "Telegram bot for comment moderation",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "keywords": ["telegram", "bot", "comments"],
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "node-fetch": "^2.7.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
وهذا كود package.json في مستودع بوت ايضا
{
  "name": "watch-vip",
  "version": "1.0.0",
  "lockfileVersion": 2,
  "requires": true,
  "packages": {
    "": {
      "name": "watch-vip",
      "version": "1.0.0",
      "license": "MIT",
      "dependencies": {
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "express": "^4.18.2",
        "node-fetch": "^2.7.0"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/accepts": {
      "version": "1.3.8",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-1.3.8.tgz",
      "integrity": "sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==",
      "dependencies": {
        "mime-types": "~2.1.34",
        "negotiator": "0.6.3"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/array-flatten": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/array-flatten/-/array-flatten-1.1.1.tgz",
      "integrity": "sha512-PCVAQswWemu6UdxsDFFX/+gVeYqKAod3D3UVm91jHwynguOwAvYPhx8nNlM++NqRcK6CxxpUafjmhIdKiHibqg=="
    },
    "node_modules/body-parser": {
      "version": "1.20.4",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-1.20.4.tgz",
      "integrity": "sha512-ZTgYYLMOXY9qKU/57FAo8F+HA2dGX7bqGc71txDRC1rS4frdFI5R7NhluHxH6M0YItAP0sHB4uqAOcYKxO6uGA==",
      "dependencies": {
        "bytes": "~3.1.2",
        "content-type": "~1.0.5",
        "debug": "2.6.9",
        "depd": "2.0.0",
        "destroy": "~1.2.0",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.4.24",
        "on-finished": "~2.4.1",
        "qs": "~6.14.0",
        "raw-body": "~2.5.3",
        "type-is": "~1.6.18",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8",
        "npm": "1.2.8000 || >= 1.4.16"
      }
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/content-disposition": {
      "version": "0.5.4",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-0.5.4.tgz",
      "integrity": "sha512-FveZTNuGw04cxlAiWbzi6zTAL/lhehaWbTtgluJh4/E95DqMwTmha3KZN1aAWA8cFIhHzMZUvLevkw5Rqk+tSQ==",
      "dependencies": {
        "safe-buffer": "5.2.1"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/content-type": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-1.0.5.tgz",
      "integrity": "sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie-signature": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.0.7.tgz",
      "integrity": "sha512-NXdYc3dLr47pBkpUCHtKSwIOQXLVn8dZEuywboCOJY/osA0wFSLlSawr3KN8qXJEyX66FcONTH8EIlVuK0yyFA=="
    },
    "node_modules/cors": {
      "version": "2.8.5",
      "resolved": "https://registry.npmjs.org/cors/-/cors-2.8.5.tgz",
      "integrity": "sha512-KIHbLJqu73RGr/hnbrO9uBeixNGuvSQjul/jdFvS/KFSIH1hWVd1ng7zOHx+YrEfInLG7q4n6GHQ9cDtxv/P6g==",
      "dependencies": {
        "object-assign": "^4",
        "vary": "^1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/destroy": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/destroy/-/destroy-1.2.0.tgz",
      "integrity": "sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==",
      "engines": {
        "node": ">= 0.8",
        "npm": "1.2.8000 || >= 1.4.16"
      }
    },
    "node_modules/dotenv": {
      "version": "16.6.1",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-16.6.1.tgz",
      "integrity": "sha512-uBq4egWHTcTt33a72vpSG0z3HnPuIl6NqYcTrKEg2azoEyl2hpW0zqlxysq2pK9HlDIHyHyakeYaYnSAwd8bow==",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow=="
    },
    "node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.1.tgz",
      "integrity": "sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow=="
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/express": {
      "version": "4.22.1",
      "resolved": "https://registry.npmjs.org/express/-/express-4.22.1.tgz",
      "integrity": "sha512-F2X8g9P1X7uCPZMA3MVf9wcTqlyNp7IhH5qPCI0izhaOIYXaW9L535tGA3qmjRzpH+bZczqq7hVKxTR4NWnu+g==",
      "dependencies": {
        "accepts": "~1.3.8",
        "array-flatten": "1.1.1",
        "body-parser": "~1.20.3",
        "content-disposition": "~0.5.4",
        "content-type": "~1.0.4",
        "cookie": "~0.7.1",
        "cookie-signature": "~1.0.6",
        "debug": "2.6.9",
        "depd": "2.0.0",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "etag": "~1.8.1",
        "finalhandler": "~1.3.1",
        "fresh": "~0.5.2",
        "http-errors": "~2.0.0",
        "merge-descriptors": "1.0.3",
        "methods": "~1.1.2",
        "on-finished": "~2.4.1",
        "parseurl": "~1.3.3",
        "path-to-regexp": "~0.1.12",
        "proxy-addr": "~2.0.7",
        "qs": "~6.14.0",
        "range-parser": "~1.2.1",
        "safe-buffer": "5.2.1",
        "send": "~0.19.0",
        "serve-static": "~1.16.2",
        "setprototypeof": "1.2.0",
        "statuses": "~2.0.1",
        "type-is": "~1.6.18",
        "utils-merge": "1.0.1",
        "vary": "~1.1.2"
      },
      "engines": {
        "node": ">= 0.10.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/finalhandler": {
      "version": "1.3.2",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-1.3.2.tgz",
      "integrity": "sha512-aA4RyPcd3badbdABGDuTXCMTtOneUCAYH/gxoYRTZlIJdF0YPWuGqiAsIrhNnnqdXGswYk6dGujem4w80UJFhg==",
      "dependencies": {
        "debug": "2.6.9",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "on-finished": "~2.4.1",
        "parseurl": "~1.3.3",
        "statuses": "~2.0.2",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fresh": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-0.5.2.tgz",
      "integrity": "sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz",
      "integrity": "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/http-errors": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.1.tgz",
      "integrity": "sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==",
      "dependencies": {
        "depd": "~2.0.0",
        "inherits": "~2.0.4",
        "setprototypeof": "~1.2.0",
        "statuses": "~2.0.2",
        "toidentifier": "~1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.4.24",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.4.24.tgz",
      "integrity": "sha512-v3MXnZAcvnywkTUEZomIActle7RXXeedOR31wwl7VlyoXO4Qi9arvSenNQWne1TcRwhCL1HwLI21bEqdpj8/rA==",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ=="
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-0.3.0.tgz",
      "integrity": "sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/merge-descriptors": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-1.0.3.tgz",
      "integrity": "sha512-gaNvAS7TZ897/rVaZ0nMtAyxNyi/pdbjbAwUpFQpN70GqnVfOiXpeUUMKRBmzXaSQ8DdTX4/0ms62r2K+hE6mQ==",
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/methods": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/methods/-/methods-1.1.2.tgz",
      "integrity": "sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/mime/-/mime-1.6.0.tgz",
      "integrity": "sha512-x0Vn8spI+wuJ1O6S7gnbaQg8Pxh4NNHb7KSINmEWKiPE4RKOplvijn+NkmYmmRgP68mc70j2EbeTFRsrswaQeg==",
      "bin": {
        "mime": "cli.js"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A=="
    },
    "node_modules/negotiator": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.3.tgz",
      "integrity": "sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/node-fetch": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/node-fetch/-/node-fetch-2.7.0.tgz",
      "integrity": "sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==",
      "dependencies": {
        "whatwg-url": "^5.0.0"
      },
      "engines": {
        "node": "4.x || >=6.0.0"
      },
      "peerDependencies": {
        "encoding": "^0.1.0"
      },
      "peerDependenciesMeta": {
        "encoding": {
          "optional": true
        }
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/on-finished": {
      "version": "2.4.1",
   وهذا كود  package-lock التابع للمستودع البوت ايضا
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.production

# Logs
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
وهذا كود gitignore. التابع لمستودع بوت ايضا
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
وهذا كود Dockerfile التابع لمستودع بوت ايضا
ولدي مجلد ايضا في مستودع بوت ايضا 
اسمه data في داخله ملف اسمه comments.json
وداخل ملف comments.json
[]

عند ارسال التعليق الى البوت وموافقة عليه، لا يقوم البوت تلقائيا بنشر التعليق داخل الموقع
