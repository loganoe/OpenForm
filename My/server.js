const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const https = require("https");



// Use dynamic import for node-fetch
let fetch;
async function loadFetch() {
    fetch = (await import('node-fetch')).default; // dynamically import node-fetch
}
loadFetch(); // Call it to initialize fetch
async function triggerActionInBackend() {
    console.log('Backend function triggered!');

    // Send a request to the correct endpoint (use https://localhost:3001)
    fetch('https://localhost:3001/trigger-action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        agent: new https.Agent({
            rejectUnauthorized: false // Disable certificate validation for self-signed certificates
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message); // Log the response from the frontend (via response)
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Create an HTTPS server


var espIp = "http://192.168.68.173";
const app = express();
const PORT = 3001;

// Functions to control the robot
async function moveForward() { 
    await fetch(espIp + '/forward'); 
}

async function moveLeft() { 
    await fetch(espIp + '/left'); 
}

async function stopRobot() { 
    await fetch(espIp + '/stop'); 
}

async function moveRight() { 
    await fetch(espIp + '/right'); 
}

async function moveReverse() { 
    await fetch(espIp + '/reverse'); 
}

async function moveUp() { 
    await fetch(espIp + '/up'); 
}

async function stopArm() { 
    await fetch(espIp + '/stoparm'); 
}

async function moveDown() { 
    await fetch(espIp + '/down'); 
}

// Function to extract and handle movement commands
async function extractMovement(string) {
    if (string.includes("{")) {
    const extractTextBetweenSubstrings = (str, start, end) => {
        const startIndex = str.indexOf(start) + start.length;
        const endIndex = str.indexOf(end, startIndex);
        return str.slice(startIndex, endIndex);
    };

    var newTxt = extractTextBetweenSubstrings(string, "{", "}");
    var possibleCombs = newTxt.split(",");
    
    for (let i = 0; i < possibleCombs.length; i++) {
        if (possibleCombs[i].includes("forward")) {
            console.log("NEW COMMAND RECEIVED! 1");
            var dStr = possibleCombs[i].replace("forward:", "");
            var tStr = Number(dStr);
            var time = Math.floor((tStr * 1000) / 3.8);
            console.log(time);
            await moveForward();
            await new Promise(resolve => setTimeout(resolve, time));
            await stopRobot();
        } else if (possibleCombs[i].includes("backward")) {
            console.log("NEW COMMAND RECEIVED! 2");
            var dStr = possibleCombs[i].replace("backward:", "");
            var tStr = Number(dStr);
            var time = Math.floor((tStr * 1000) / 3.8);
            console.log(time);
            await moveReverse();
            await new Promise(resolve => setTimeout(resolve, time));
            await stopRobot();
        } else if (possibleCombs[i].includes("right")) {
            console.log("NEW COMMAND RECEIVED! 3");
            var dStr = possibleCombs[i].replace("right:", "");
            var tStr = Number(dStr);
            var time = Math.floor(tStr * 25.5);
            console.log(time);
            await moveRight();
            await new Promise(resolve => setTimeout(resolve, time));
            await stopRobot();
        } else if (possibleCombs[i].includes("left")) {
            console.log("NEW COMMAND RECEIVED! 4");
            var dStr = possibleCombs[i].replace("left:", "");
            var tStr = Number(dStr);
            var time = Math.floor(tStr * 25.5);
            console.log(time);
            await moveLeft();
            await new Promise(resolve => setTimeout(resolve, time));
            await stopRobot();
        } else if (possibleCombs[i].includes("up")) {
            console.log("NEW COMMAND RECEIVED! 5");
            var dStr = possibleCombs[i].replace("up:", "");
            var tStr = Number(dStr);
            var time = Math.floor(tStr * 20);
            console.log(time);
            await moveUp();
            await new Promise(resolve => setTimeout(resolve, time));
            await stopArm();
        } else if (possibleCombs[i].includes("down")) {
            console.log("NEW COMMAND RECEIVED! 6");
            var dStr = possibleCombs[i].replace("down:", "");
            var tStr = Number(dStr);
            var time = Math.floor(tStr * 20);
            console.log(time);
            await moveDown();
            await new Promise(resolve => setTimeout(resolve, time));
            await stopArm();
        } else if (possibleCombs[i].includes("goToObject")) {
            console.log("NEW COMMAND RECEIVED! 7");
            var dStr = possibleCombs[i].replace("goToObject:", "");
            var tStr = dStr;
            homeToItem(tStr);
        }
    }
    console.log("processing finish exception")

} else {
    console.log("processing finish exception")
    if (string.includes("PERSISTENT")) {
        // I want to do the same thing as the /analyze route, but with new image data. 
        console.log("Calling the AI again with new image data...");
        triggerActionInBackend();
    } else {

    }
    
}
}
// configure middleware
app.use(cors({ origin: "https://localhost:3001" })); // note the 'https' protocol
app.use(bodyParser.json({ limit: "10mb" }));

// fixed system prompt
const SYSTEM_PROMPT = `You are a PHYSICAL ROBOT with the ability to move and interact with the world. Use simple, brief responses for speech. Your movements are controlled with commands in curly brackets, such as {forward: 10} for 10 cm forward or {left: 90} for a 90° turn. Use one set of curly brackets for all movement commands, even if multiple actions are needed (e.g., {left: 90, forward: 10}). You can also not add any movement commands and just provide a text response.

You have a 15 cm arm with a magnet. Move the arm down 240° to pick up items, and bring it back up after use. The arm can only handle light objects, while heavy items (over 50g) should be moved using the rails, which can push items but not lift them.

When a task requires continuous action, append "PERSISTENT" to your response. For example, moving forward until an object is detected should be phrased as: “Move forward 10 cm” + “PERSISTENT” to indicate ongoing action until the task completes. Remove the "PERSISTENT" tag when the task is finished.

To calculate turns:

Use a multiplier of 2.2 for turns when using the rails.
Use 1.8 for all other turns. Ensure you always use a single set of curly brackets for any instructions, as multiple sets will break the system. Avoid any commands that aren't {forward}, {backward}, {left}, {right}, {up}, or {down}, and remember to add the appropriate numbers for each movement.`;
var prePrompt = ""; 
// handle image analysis request
app.post("/analyze", async (req, res) => {
    try {
        const { image, prompt } = req.body;

        // decode base64 image
        const imagePath = path.join(__dirname, "input.jpg");
        fs.writeFileSync(imagePath, Buffer.from(image, "base64"));
        console.log(imagePath); 
        // send to ollama
        const response = await axios.post("http://localhost:11434/api/generate", {
            model: "llama3.2-vision",
            prompt: `${SYSTEM_PROMPT}\nUser: ${prompt + ". REMEMBER TO ADD PERSISTENT TO THE END OF THE AI RESPONSE IF YOU THINK THE USER'S REQUEST HAS NOT BEEN SATISFIED."}`,
            images: [fs.readFileSync(imagePath, "base64")], // send image as base64
            stream: false
        });
        console.log("User request sent: ", prompt);
        prePrompt = prompt; 
        console.log(response.data.response);

        res.json({ reply: response.data.response });
        await extractMovement(response.data.response);
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
app.post('/trigger-action', (req, res) => {
    const response = triggerActionInBackend(); // Trigger backend action
    res.json(response);  // Send the response to the frontend
  });
// read the ssl certificate and key
const sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};


// Function to trigger action in the frontend
function triggerActionInBackend() {
    console.log('Backend function triggered!');
    
    // Send an SSE message to the frontend
    broadcastToClients(prePrompt + ". THIS IS A PERSISTENT COMMAND. ADD PERSISTENT TO THE END OF YOUR NEXT MESSAGE IF YOU THINK THE USER'S REQUEST HAS NOT BEEN SATISFIED. IF THE USER REQUEST HAS BEEN SATISFIED, REMOVE THE PERSISTENT TAG.");
}


const clients = [];
// SSE route to send events to the frontend
app.get("/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Flush headers to establish the SSE connection

    // Add the client to a list of connected clients
    clients.push(res);

    // Remove the client when the connection is closed
    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) {
            clients.splice(index, 1);
        }
    });
});
// Function to broadcast messages to all connected clients
function broadcastToClients(message) {
    clients.forEach(client => {
        client.write(`data: ${message}\n\n`);
    });
}
// create an https server
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});
