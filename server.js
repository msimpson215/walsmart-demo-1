import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(ROOT, "public"), { extensions: ["html"] }));

// Simple text-only chat proxy to OpenAI Responses API
app.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });
    }

    // Lightweight system prompt to keep VoxTalk concise and helpful
    const sys = [
      "You are VoxTalk.",
      "Be concise, clear, and friendly.",
      "If asked for code, provide minimal runnable snippets.",
      "If asked for steps, use short, numbered bullets."
    ].join(" ");

    // Using Responses API (json output)
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          { role: "system", content: sys },
          { role: "user", content: prompt }
        ],
      })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(()=>"");
      return res.status(resp.status).json({ error: `OpenAI error: ${text || resp.statusText}` });
    }

    const data = await resp.json();
    // Responses API returns "output_text" convenience field
    const reply = data.output_text || "I’m here.";
    return res.json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server crashed processing /chat" });
  }
});

// Fallback to index.html for root
app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VoxTalk Core Clean v1 running on http://localhost:${PORT}`);
});
