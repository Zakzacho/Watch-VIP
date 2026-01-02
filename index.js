import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!TOKEN || !ADMIN_ID) {
  console.error("Missing TELEGRAM_TOKEN or ADMIN_ID");
}

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.post("/submit-comment", async (req, res) => {
  try {
    const { name, comment } = req.body;

    if (!comment) {
      return res.status(400).json({ ok: false });
    }

    const text =
`🆕 تعليق جديد

👤 الاسم: ${name || "مستخدم"}
💬 التعليق:
${comment}`;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text
      })
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
