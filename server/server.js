import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(express.static("public"));
app.use(express.json({ limit: "2mb" }));

// Text Chat (English-only)
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
              "If the user speaks another language, politely say you can only respond in English for this demo. " +
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

// Voice Session (English-only)
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
        // Hard English lock:
        instructions:
          "You are VoxTalk, a calm, friendly assistant for Walmart shoppers. " +
          "Speak and respond in English (US) only. Never use any other language. " +
          "If the user speaks a different language, say: 'For this demo, I can only respond in English.' " +
          "Keep answers concise and helpful."
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
app.listen(PORT, () => console.log("✅ Walmart VoxTalk running on port " + PORT));
