import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const pending = new Map();
const approved = [];

app.post("/submit-comment", async (req, res) => {
  const { name, comment } = req.body;

  if (!name || !comment) {
    return res.status(400).json({ ok: false });
  }

  const id = Date.now().toString();
  pending.set(id, { id, name, comment, date: Date.now() });

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_ID,
      text: `🆕 تعليق جديد\n\n👤 ${name}\n📝 ${comment}`,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ موافقة", callback_data: `approve:${id}` },
          { text: "❌ رفض", callback_data: `reject:${id}` }
        ]]
      }
    })
  });

  res.json({ ok: true });
});

app.post("/telegram", async (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const { id: cbId, data } = update.callback_query;
    const [action, commentId] = data.split(":");

    if (pending.has(commentId)) {
      const c = pending.get(commentId);

      if (action === "approve") {
        approved.push(c);
      }

      pending.delete(commentId);
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: cbId,
        text: action === "approve" ? "تمت الموافقة ✅" : "تم الرفض ❌"
      })
    });
  }

  res.send("OK");
});

app.get("/comments", (req, res) => {
  res.json(approved);
});

app.get("/", (req, res) => {
  res.send("Bot running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT);
