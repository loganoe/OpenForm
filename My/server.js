const axios = require('axios');
const express = require("express");
const path = require("path");
const app = express();
const http = require('http');
var signout = false; 
const server = http.createServer(app);
const fs = require('node:fs');
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/chat', function(req, res) {
    res.sendFile(path.join(__dirname, '/ui.html')); 
})
io.on('connection', (socket) => {
    console.log("New connection :)"); 
    socket.on('request', async (msg) => {
        console.log("message: " + msg); 
        console.log("someone sent a message, asking deepseek rn... ");
        var output = await askDeepSeek(msg); 
        socket.emit('response', output); 
    })
}); 
async function askDeepSeek(prompt) {
    const systemPrompt = "You are in control of a PHYSICAL ROBOT which can move forward and backward, as well as turn a specified amount of degrees. If you think it is appropriate based on the user's prompt, you can move the robot forward, backward, or turn it by putting a command into curly brackets {}. For example, to move forward 10cm, just say {forward: 10}. To move left 90 degrees, say {left: 90}. You can also not give any commands and only give a text answer, if it is appropriate. Text answers as well as movement commands are also permitted. Putting multiple movement commands seperated by commas is also fine, and they will be executed in left to right order (e.g to move 90 degrees left then forward 10 cm, the commamnd would be {left:90,forward:10}). No more than one set of curly brackets is allowed."; 
    const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'deepseek-r1:8b',
        prompt: prompt,
        system: systemPrompt,
        stream: false
    });

    console.log(response.data.response);
    return response.data.response; 
}
server.listen(3000, () => {
    console.log('ok its working');
});

// askDeepSeek("Please explain what you just said in terms that a five year old would understand. "); 
