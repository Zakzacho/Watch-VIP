const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '';
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

// إعداد PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// إنشاء جدول التعليقات والـ Indexes عند التشغيل
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        verified BOOLEAN DEFAULT FALSE,
        time BIGINT NOT NULL
      )
    `);
    console.log('✅ تم إنشاء/التحقق من جدول التعليقات');

    // إضافة العمود verified إذا لم يكن موجودًا (للتوافق مع الجداول القديمة)
    await pool.query(`
      ALTER TABLE comments
      ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ تم التحقق من عمود verified');

    // إنشاء Indexes لتحسين الأداء
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_status
      ON comments(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_ip_hash
      ON comments(ip_hash)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_time
      ON comments(time DESC)
    `);
    console.log('✅ تم إنشاء/التحقق من الـ Indexes');
  } catch (err) {
    console.error('❌ خطأ في إنشاء الجدول:', err);
    throw err;
  }
}

// اختبار الاتصال
pool.on('error', (err) => {
  console.error('❌ خطأ في اتصال PostgreSQL:', err);
});

pool.on('connect', () => {
  console.log('✅ تم الاتصال بـ PostgreSQL');
});

// إعداد CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  String(text || '').replace(/[<>]/g, '').trim();

// دوال قاعدة البيانات
async function saveCommentToDb(comment) {
  try {
    await pool.query(
      `INSERT INTO comments (id, name, text, ip_hash, status, verified, time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [comment.id, comment.name, comment.text, comment.ipHash, comment.status, comment.verified, comment.time]
    );
    console.log('💾 تم حفظ التعليق في PostgreSQL');
  } catch (err) {
    console.error('❌ خطأ في حفظ التعليق:', err);
    throw err;
  }
}

async function updateCommentStatus(commentId, status) {
  try {
    await pool.query(
      `UPDATE comments SET status = $1 WHERE id = $2`,
      [status, commentId]
    );
    console.log(`✅ تم تحديث التعليق ${commentId} إلى ${status}`);
  } catch (err) {
    console.error('❌ خطأ في تحديث التعليق:', err);
    throw err;
  }
}

async function getCommentById(id) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM comments WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('❌ خطأ في الحصول على التعليق:', err);
    throw err;
  }
}

async function getApprovedComments() {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM comments WHERE status = 'approved' ORDER BY time DESC`
    );
    return rows || [];
  } catch (err) {
    console.error('❌ خطأ في استرجاع التعليقات:', err);
    throw err;
  }
}

async function hasApprovedComment(ipHash) {
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM comments WHERE ip_hash = $1 AND status = 'approved' LIMIT 1`,
      [ipHash]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('❌ خطأ في التحقق:', err);
    throw err;
  }
}

async function getPendingCommentsCount() {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count FROM comments WHERE status = 'pending'`
    );
    return parseInt(rows[0]?.count || 0, 10);
  } catch (err) {
    console.error('❌ خطأ في عد التعليقات:', err);
    throw err;
  }
}

// دوال Telegram
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

const telegramEdit = async (messageId, text) => {
  if (!TELEGRAM_API || !ADMIN_CHAT_ID) return;
  try {
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
  } catch (err) {
    console.error('❌ خطأ في تعديل رسالة:', err);
  }
};

const telegramAnswer = async (callbackId, text = '') => {
  if (!TELEGRAM_API) return;
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text,
        show_alert: false
      })
    });
  } catch (err) {
    console.error('❌ خطأ في الرد على callback:', err);
  }
};

// متغير للـ Polling
let pollingOffset = 0;

// معالجة callback query
async function handleCallbackQuery(callbackQuery) {
  await telegramAnswer(callbackQuery.id);

  const [action, id] = String(callbackQuery.data || '').split('_');
  
  let comment;
  try {
    comment = await getCommentById(id);
  } catch (err) {
    console.error('❌ خطأ في جلب التعليق:', err);
    return;
  }

  if (!comment) {
    console.log('❌ تعليق غير موجود:', id);
    return;
  }

  // شرط آمن للقبول والرفض
  if (
    (action === 'approve' || action === 'reject') &&
    comment.status !== 'pending'
  ) {
    console.log('⚠️ محاولة معالجة تعليق ليس معلقًا:', id);
    await telegramEdit(
      callbackQuery.message.message_id,
      '⚠️ هذا التعليق تم معالجته بالفعل'
    );
    return;
  }

  try {
    if (action === 'approve') {
      console.log('✅ تمت الموافقة على التعليق:', id);
      await updateCommentStatus(id, 'approved');
      
      // رسالة التأكيد
      await telegramEdit(
        callbackQuery.message.message_id,
        `✅ تم القبول\n\n👤 ${comment.name}\n💬 ${comment.text}`
      );

      // إرسال رسالة جديدة مع الأزرار الإضافية
      const keyboard = [[
        { text: '🗑 حذف', callback_data: `delete_${id}` },
        { text: '⭐ توثيق', callback_data: `verify_${id}` }
      ]];

      await telegramSend(
        `📌 تعليق معتمد\n\n👤 ${comment.name}\n💬 ${comment.text}`,
        keyboard
      );
    }

    if (action === 'reject') {
      console.log('❌ تم رفض التعليق:', id);
      await updateCommentStatus(id, 'rejected');
      await telegramEdit(
        callbackQuery.message.message_id,
        `❌ تم الرفض\n\n👤 ${comment.name}\n💬 ${comment.text}`
      );
    }

    if (action === 'delete') {
      console.log('🗑 تم حذف التعليق:', id);
      await pool.query(
        `DELETE FROM comments WHERE id = $1`,
        [id]
      );
      await telegramEdit(
        callbackQuery.message.message_id,
        '🗑 تم حذف التعليق نهائيًا'
      );
    }

    if (action === 'verify') {
      const newStatus = !comment.verified;
      console.log(`${newStatus ? '⭐ توثيق' : '❌ إلغاء توثيق'} التعليق:`, id);

      await pool.query(
        `UPDATE comments SET verified = $1 WHERE id = $2`,
        [newStatus, id]
      );

      await telegramEdit(
        callbackQuery.message.message_id,
        `${newStatus ? '⭐ تم توثيق التعليق' : '❌ تم إلغاء التوثيق'}\n\n👤 ${comment.name}\n💬 ${comment.text}`
      );
    }
  } catch (err) {
    console.error('❌ خطأ في معالجة callback:', err);
  }
}

// دالة Polling
async function startPolling() {
  if (!TELEGRAM_API) {
    console.log('⚠️ BOT_TOKEN مفقود - لن يتم تشغيل Polling');
    return;
  }

  console.log('🔄 جاري تشغيل Polling...');

  try {
    await fetch(`${TELEGRAM_API}/deleteWebhook`);
    console.log('✅ تم حذف webhook القديم');
  } catch (err) {
    console.error('⚠️ خطأ في حذف webhook:', err);
  }

  setInterval(async () => {
    try {
      const response = await fetch(
        `${TELEGRAM_API}/getUpdates?offset=${pollingOffset}&timeout=30`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const data = await response.json();

      if (!data.ok) {
        console.error('❌ خطأ في getUpdates:', data);
        return;
      }

      for (const update of data.result || []) {
        pollingOffset = update.update_id + 1;

        if (update.callback_query) {
          console.log('🔔 callback_query استلم:', update.callback_query.data);
          await handleCallbackQuery(update.callback_query);
        }
      }
    } catch (err) {
      console.error('❌ خطأ في Polling:', err);
    }
  }, 2000);
}

// المسارات
app.get('/', async (req, res) => {
  try {
    const pendingCount = await getPendingCommentsCount();
    res.json({
      status: 'running',
      uptime: process.uptime(),
      pending: pendingCount,
      database: 'PostgreSQL'
    });
  } catch (err) {
    res.json({
      status: 'running',
      database: 'PostgreSQL',
      error: 'Could not fetch pending count'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    telegram: !!TELEGRAM_API,
    polling: !!TELEGRAM_API,
    database: 'PostgreSQL'
  });
});

app.post('/submit-comment', async (req, res) => {
  console.log('📨 تعليق جديد مستلم');

  const { name, text, clientId } = req.body || {};
  if (!text || !clientId) {
    console.log('❌ بيانات غير صالحة');
    return res.status(400).json({ error: 'invalid data' });
  }

  try {
    const ipHash = hashIP(getClientIP(req));
    const alreadyApproved = await hasApprovedComment(ipHash);

    if (alreadyApproved) {
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
      verified: false,
      time: Date.now()
    };

    await saveCommentToDb(comment);

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
  } catch (err) {
    console.error('❌ خطأ في معالجة التعليق:', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/comments', async (req, res) => {
  try {
    const comments = await getApprovedComments();
    console.log(`📋 طلب التعليقات: ${comments.length} تعليق معتمد`);
    
    res.json(
      comments.map(c => ({
        commentId: c.id,
        displayName: c.name,
        text: c.text,
        verified: c.verified === true,
        timestamp: c.time
      }))
    );
  } catch (err) {
    console.error('❌ خطأ في استرجاع التعليقات:', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// بدء التشغيل
(async () => {
  try {
    await initializeDatabase();
    await startPolling();

    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 السيرفر يعمل على المنفذ', PORT);
      console.log('🤖 BOT_TOKEN:', BOT_TOKEN ? '✅ موجود' : '❌ مفقود');
      console.log('💬 ADMIN_CHAT_ID:', ADMIN_CHAT_ID ? '✅ موجود' : '❌ مفقود');
      console.log('💾 قاعدة البيانات: PostgreSQL');
      console.log('📡 الاتصال: Polling');
    });
  } catch (err) {
    console.error('❌ خطأ في بدء التشغيل:', err);
    process.exit(1);
  }
})();

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 استلام SIGTERM - جاري الإغلاق بشكل آمن...');
  await pool.end();
  console.log('✅ تم إغلاق اتصال PostgreSQL');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 استلام SIGINT - جاري الإغلاق بشكل آمن...');
  await pool.end();
  console.log('✅ تم إغلاق اتصال PostgreSQL');
  process.exit(0);
});
