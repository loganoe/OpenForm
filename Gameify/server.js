// server.js
const express = require('express');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(express.json());

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// server.js snippet (inside your app.post handler)
app.post('/api/generate-game', async (req, res) => {
    const { prompt, categories, mode, previousCode } = req.body;

    const geminiPrompt = `
    Write JavaScript code that renders a game onto a 600x800 HTML5 canvas.
    Prompt: ${prompt}
    Categories: ${categories.join(", ")}
    Mode: ${mode}
    Previous Code: ${previousCode}
    The code should directly draw into the canvas with id="gameCanvas".
    Do not include HTML, only JavaScript.
    `;

    console.log("=== Gemini Request ===");
    console.log("Prompt:", geminiPrompt);

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=REPLACE_WITH_API_KEY",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: geminiPrompt }] }]
                })
            }
        );

        const json = await response.json();

        console.log("=== Gemini Raw Response ===");
        console.dir(json, { depth: null });

        const code = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("=== Extracted Code ===");
        console.log(code);

        if (!code) {
            return res.status(500).json({ error: "Gemini returned no code" });
        }

        res.json({ code });
    } catch (e) {
        console.error("=== Gemini Error ===");
        console.error(e);
        res.status(500).json({ error: "Failed to call Gemini" });
    }
});


// Fallback: serve index.html for any other route (useful if you add client-side routing later)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));