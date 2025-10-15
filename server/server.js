import express from "express";
import fetch from "node-fetch";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- Stripe Checkout ---
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "WalSmart Demo Product" },
          unit_amount: 1999
        },
        quantity: 1
      }],
      success_url: `${process.env.DOMAIN}/success.html`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`
    });
    res.json({ id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- VoxTalk Realtime Session ---
app.get("/session", async (req, res) => {
  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: "alloy"
    })
  });
  const data = await response.json();
  res.json(data);
});

// --- Classic Text Chat ---
app.post("/chat", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: text }]
      })
    });
    const data = await response.json();
    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`WalSmart + VoxTalk running on ${PORT}`));
