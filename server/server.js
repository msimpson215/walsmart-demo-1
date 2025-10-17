// ===========================================================
// VoxTalk™ Mothership — English-Only Realtime Server
// ===========================================================

import express from "express";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static client (index.html + style.css)
app.use(express.static("public"));

// Start HTTP server
const server = app.listen(PORT, () =>
  console.log(`✅ VoxTalk™ running at http://localhost:${PORT}`)
);

// WebSocket bridge for Realtime voice
const wss = new WebSocketServer({ server });

// ===========================================================
// 🔊 Realtime Session (English-Only Lock)
// ===========================================================
wss.on("connection", async (ws) => {
  console.log("🎤 Client connected.");

  // --- Create OpenAI Realtime session ---
  const session = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: "alloy",

      // ✅ Critical: lock input/output to English only
      language: "en-US",

      input_audio_format: "wav",
      output_audio_format: "wav",

      // ✅ Instruction block — prevents any language switching
      instructions: `
        You are VoxTalk™, an English-only voice assistant.
        Speak, listen, and respond exclusively in English (en-US).
        If a user speaks another language, answer only in English:
        "Sorry, I can only assist in English."
        Never translate or switch languages.
      `,
    }),
  });

  if (!session.ok) {
    console.error("❌ Failed to create session:", await session.text());
    ws.close();
    return;
  }

  const data = await session.json();
  const realtimeUrl = data.client_secret.value;

  // Connect to OpenAI Realtime endpoint
  const client = new WebSocket(realtimeUrl, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  // Forward messages between browser and OpenAI
  ws.on("message", (msg) => client.send(msg));
  client.on("message", (msg) => ws.send(msg));

  ws.on("close", () => {
    console.log("❌ Browser disconnected.");
    client.close();
  });

  client.on("close", () => console.log("🪶 Realtime session closed."));
});

// ===========================================================
// Optional fallback route
// ===========================================================
app.get("/health", (_, res) => res.send("VoxTalk™ Server OK — English-Only Mode Active"));
