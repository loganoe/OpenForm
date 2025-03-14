const readline = require('readline');
const http = require('http');
const screenshot = require('screenshot-desktop');
const fs = require('fs');
const robot = require('robotjs');

// Set up readline interface to take user input from the terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter prompt for LLaVA: '
});

/**
 * Captures a screenshot and returns the file path.
 */
async function captureScreenshot() {
    const filePath = './screenshot.png';
    await screenshot({ filename: filePath });
    return filePath;
}

/**
 * Parses and executes AI-generated RobotJS commands.
 * @param {string} commandStr - The command string from AI.
 */
function executeCommand(commandStr) {
    try {
        console.log(`Raw AI Response: ${commandStr}`);

        // Regex to match valid function calls
        const commandRegex = /moveCursorTo\(\d+,\s*\d+\)|click\(\)|typeText\(".*?"\)/g;
        const commands = commandStr.match(commandRegex) || []; // Extract commands

        if (commands.length === 0) {
            console.warn("No valid commands found.");
            return;
        }

        // Execute each extracted command
        for (const command of commands) {
            console.log(`Executing: ${command}`);

            if (command.startsWith("moveCursorTo(")) {
                const [x, y] = command.match(/\d+/g).map(Number);
                robot.moveMouse(x, y);
            } else if (command === "click()") {
                robot.mouseClick();
            } else if (command.startsWith("typeText(")) {
                const text = command.match(/"([^"]+)"/)[1];
                robot.typeString(text);
            }
        }
    } catch (error) {
        console.error("Error executing commands:", error);
    }
}

/**
 * Queries LLaVA and executes UI commands.
 * @param {string} userPrompt - The user request.
 */
async function queryLLaVA(userPrompt) {
    try {
        const screenshotPath = await captureScreenshot();
        const imageBuffer = fs.readFileSync(screenshotPath);
        const base64Image = imageBuffer.toString('base64');

        const requestData = JSON.stringify({
            model: "llava:13b",
            system: `You are a UI automation assistant. Your task is to control the user's computer using JavaScript commands executed through RobotJS. Respond ONLY with function calls, NO explanations.
            
            Available Commands:
            - moveCursorTo(x, y) → Moves the cursor to (x, y)
            - click() → Clicks the mouse at the current position
            - typeText("your text") → Types the given text
            
            Example Responses:
            moveCursorTo(100, 200)
            click()
            typeText("Hello, world!")`,
            prompt: userPrompt,
            images: [base64Image]
        });

        return new Promise((resolve, reject) => {
            const req = http.request(
                {
                    hostname: 'localhost',
                    port: 11434,
                    path: '/api/generate',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(requestData),
                    }
                },
                (res) => {
                    let fullResponse = '';
                    let finalText = '';

                    res.on('data', (chunk) => {
                        fullResponse += chunk.toString();

                        // Handle JSON streaming: process each line separately
                        const lines = fullResponse.split("\n");
                        fullResponse = lines.pop(); // Keep incomplete JSON for next event

                        for (const line of lines) {
                            try {
                                const jsonData = JSON.parse(line);
                                if (jsonData.response) {
                                    finalText += jsonData.response; // Concatenate streamed text
                                }
                            } catch (err) {
                                console.error("Skipping invalid JSON chunk:", line);
                            }
                        }
                    });

                    res.on('end', () => {
                        if (finalText.trim()) {
                            console.log("AI Response:", finalText);
                            executeCommand(finalText.trim()); // Run AI-generated command
                            resolve(finalText);
                        } else {
                            reject("Empty response from Ollama.");
                        }
                    });
                }
            );

            req.on('error', (error) => reject(`Request error: ${error.message}`));
            req.write(requestData);
            req.end();
        });
    } catch (error) {
        console.error("Error querying LLaVA:", error);
        return "Failed to process request.";
    }
}

// Begin terminal interaction with user
rl.prompt();

rl.on('line', (input) => {
    if (input.trim()) {
        queryLLaVA(input).then(response => {
            console.log("Response processed.");
            rl.prompt(); // Continue prompting for next input
        }).catch(console.error);
    } else {
        console.log("Please enter a valid prompt.");
        rl.prompt(); // Continue prompting for valid input
    }
});

rl.on('close', () => {
    console.log("Goodbye!");
    process.exit(0);
});
