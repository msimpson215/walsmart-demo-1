// server/server.js
import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

// Kill caches for everything in /public
app.use(express.static("public", {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
  }
}));

app.use(express.json({ limit: "2mb" }));

// 🩺 Health/version
const STARTED_AT = new Date().toISOString();
app.get("/__health", (_req, res) => {
  res.json({
    ok: true,
    startedAt: STARTED_AT,
    node: process.version,
    commit: process.env.RENDER_GIT_COMMIT || process.env.COMMIT || null,
    env: process.env.RENDER || "render",
  });
});

// 📂 List files under public/img so we know the exact filename Render sees
app.get("/__ls", (_req, res) => {
  try {
    const dir = path.join(process.cwd(), "public", "img");
    const items = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    res.json({
      ok: true,
      dir: "/public/img",
      items
    });
  } catch (e) {
    console.error("LS error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🧪 Serve a minimal page from the server (bypasses static middleware)
// This removes any possibility of stale cached static HTML.
app.get("/__static-test", (_req, res) => {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>__static-test @ ${STARTED_AT}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body{margin:0;background:#eee;font-family:system-ui,Arial}
    .bar{padding:12px;background:#222;color:#fff}
    img{width:100%;height:auto;display:block}
  </style>
</head>
<body>
  <div class="bar"><b>Server-started:</b> ${STARTED_AT} — If you see the big screenshot below, the image path is correct.</div>
  <img src="/img/walmart_mock_.png" alt="Walmart static mock"/>
  <div class="bar">Bottom. Now try your real static page: <a href="/walmart-static.html">/walmart-static.html</a></div>
</body>
</html>`;
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(html);
});

// TEXT CHAT
app.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        input: [
          {
            role: "system",
            content:
              "You are VoxTalk. Respond in English (US) only. " +
              "Be clear, friendly, and concise."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await r.json();
    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.output?.[0]?.content ||
      data.choices?.[0]?.message?.content ||
      "(no response)";
    res.json({ reply: text });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

// VOICE SESSION
app.post("/session", async (_req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions:
          "You are VoxTalk, a calm, friendly assistant for Walmart shoppers. Speak and respond in English (US) only. Keep answers concise and helpful."
      })
    });
    const data = await r.json();
    res.json({ client_secret: data.client_secret });
  } catch (e) {
    console.error("Session error:", e);
    res.status(500).json({ error: "session_failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Walmart VoxTalk running on port ${PORT} (started ${STARTED_AT})`);
});
