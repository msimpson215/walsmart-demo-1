import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.status(200).send("ok"));

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
        instructions:
          "You are VoxTalk. Respond in English (US) only. Be clear, friendly, and concise.",
        input: prompt
      })
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("OpenAI /responses error:", data);
      return res.status(500).json({ error: "Chat failed" });
    }

    const text =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      data.choices?.[0]?.message?.content ??
      "(no response)";

    res.json({ reply: text });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

app.post("/session", async (_req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions:
          "You are VoxTalk, a calm, friendly assistant for Walmart shoppers. Speak and respond in English (US) only. Keep answers concise and helpful."
      })
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Realtime session error:", data);
      return res.status(500).json({ error: "session_failed" });
    }

    res.json({ client_secret: data.client_secret });
  } catch (e) {
    console.error("Session error:", e);
    res.status(500).json({ error: "session_failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Walmart VoxTalk running on port " + PORT);
});
