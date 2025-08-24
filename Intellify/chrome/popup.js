document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    const questionInput = document.getElementById('questionInput');
    const askButton = document.getElementById('askButton');
    const outputArea = document.getElementById('output-area');
    const statusMessage = document.getElementById('status-message');
    const settingsButton = document.getElementById('settingsButton');
    const settingsContainer = document.getElementById('settingsContainer');

    // Focus the question input field as soon as the popup opens
    questionInput.focus();

    // Toggle the visibility of the settings container
    settingsButton.addEventListener('click', function () {
        settingsContainer.classList.toggle('hidden');
    });

    // Load the API key from storage on startup
    chrome.storage.sync.get('geminiApiKey', function (data) {
        if (data.geminiApiKey) {
            apiKeyInput.value = data.geminiApiKey;
            statusMessage.textContent = 'API key loaded.';
        } else {
            // If no key is found, show the settings container by default
            settingsContainer.classList.remove('hidden');
        }
    });

    // Save the API key to storage
    saveApiKeyButton.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ 'geminiApiKey': apiKey }, function () {
                statusMessage.textContent = 'API key saved!';
            });
        } else {
            statusMessage.textContent = 'Please enter a valid API key.';
        }
    });

    // Handle the "Ask Gemini" button click
    askButton.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();
        const question = questionInput.value.trim();

        if (!apiKey) {
            outputArea.textContent = 'Please enter and save your Gemini API key first.';
            return;
        }
        if (!question) {
            outputArea.textContent = 'Please enter a question.';
            return;
        }

        outputArea.textContent = 'Thinking...';

        // Get the current page's content
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                function: () => document.body.innerText
            }, (results) => {
                const pageContent = results[0].result;
                askGemini(apiKey, pageContent, question);
            });
        });
    });

    // Function to call the Gemini API
    async function askGemini(apiKey, pageContent, question) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const prompt = `You are a helpful assistant. The user wants to know about the current website. The website's content is:
---
${pageContent.substring(0, 5000)}
---
The user's question is: "${question}"

If the user asks to find a specific piece of text or an element on the page, and you can confidently identify it, respond with a JSON object inside a markdown code block to trigger a scrolling tool call.
Example 1: user asks "where is the 'contact us' link?" and you find an element with that text. You would respond with:
\`\`\`json
{
  "tool_code": {
    "tool_name": "scroll_to_text",
    "text": "contact us"
  }
}
\`\`\`
Example 2: user asks "where is the main heading?". You would respond with:
\`\`\`json
{
  "tool_code": {
    "tool_name": "scroll_to_selector",
    "selector": "h1"
  }
}
\`\`\`
Otherwise, answer the user's question directly based on the provided content.`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'API call failed');
            }

            const result = await response.json();
            const geminiResponse = result.candidates[0].content.parts[0].text;

            // Use a regex to extract the JSON from the markdown code block
            const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
            const match = geminiResponse.match(jsonRegex);

            if (match && match[1]) {
                try {
                    const toolCall = JSON.parse(match[1]);
                    if (toolCall.tool_code && toolCall.tool_code.tool_name) {
                        // Send a message to the content script to perform the scroll
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'scroll',
                                tool_code: toolCall.tool_code
                            }, function (response) {
                                // Check for a valid response from the content script
                                if (chrome.runtime.lastError) {
                                    outputArea.textContent = `Error: ${chrome.runtime.lastError.message}`;
                                } else if (response) {
                                    outputArea.textContent = response.message || 'Scrolled to element.';
                                } else {
                                    outputArea.textContent = 'Tool call successful, but no response from content script.';
                                }
                            });
                        });
                    } else {
                        outputArea.textContent = 'Gemini responded with a JSON, but it was not a recognized tool call.';
                    }
                } catch (e) {
                    // JSON parsing failed, display the raw response
                    outputArea.textContent = 'Error parsing tool call JSON: ' + e.message;
                    console.error('JSON Parse Error:', e);
                }
            } else {
                // Not a markdown-formatted JSON, display the text response directly
                outputArea.textContent = geminiResponse;
            }

        } catch (error) {
            outputArea.textContent = 'Error: ' + error.message;
            console.error('API Error:', error);
        }
    }
});