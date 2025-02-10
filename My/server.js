const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: "10mb" }));

// fixed system prompt
const SYSTEM_PROMPT = "You are an AI assistant that analyzes images and user queries.";

// handle image analysis request
app.post("/analyze", async (req, res) => {
    try {
        const { image, prompt } = req.body;

        // decode base64 image
        const imagePath = path.join(__dirname, "input.jpg");
        fs.writeFileSync(imagePath, Buffer.from(image, "base64"));

        // send to ollama
        const response = await axios.post("http://localhost:11434/api/generate", {
            model: "llava:13b",
            prompt: `${SYSTEM_PROMPT}\nUser: ${prompt}`,
            images: [fs.readFileSync(imagePath, "base64")], // send image as base64
            stream: false
        });
        console.log("User request sent: ", prompt); 
        console.log(response.data.response);
        res.json({ reply: response.data.response });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to process image" });
    }
});
// serve the HTML file for the chat UI
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/ui.html'));
});

// serve the HTML file for the chat UI
app.get('/visionxv', function (req, res) {
    res.sendFile(path.join(__dirname, '/visionxv.html'));
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
