import pyautogui
import ollama
import time
import io
import re
from PIL import Image

# Get screen resolution
screen_width, screen_height = pyautogui.size()

def capture_screen():
    """Captures the screen and returns the image bytes."""
    screenshot = pyautogui.screenshot()
    img_bytes = io.BytesIO()
    screenshot.save(img_bytes, format="PNG")
    return img_bytes.getvalue()

def analyze_screen(user_prompt):
    """Sends the screen image and user prompt to LLaVA-13B via Ollama."""
    img_data = capture_screen()
    system_prompt = (
        "You are an AI assistant that can analyze images and give precise screen interaction commands. "
        "You must provide your response in one of the following formats: \n"
        "- Click at (X, Y)\n"
        "- Move to (X, Y)\n"
        "- Type \"text_here\"\n"
        "Only use one action per response. Make sure to do what the user tells you. If they tell you to click on a button on the screen, click it. YOu can also give a text response to the image."
    )
    
    response = ollama.chat(model="llava:13b", messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt, "images": [img_data]}
    ])
    
    return response['message']['content']

def execute_command(command):
    """Executes commands based on model response."""
    if "click" in command.lower():
        match = re.search(r'(\d+),\s*(\d+)', command)
        if match:
            x, y = map(int, match.groups())
            if 0 <= x <= screen_width and 0 <= y <= screen_height:
                pyautogui.click(x, y)
                print(f"Clicked at ({x}, {y})")
            else:
                print("Coordinates out of screen bounds.")

    elif "move" in command.lower():
        match = re.search(r'(\d+),\s*(\d+)', command)
        if match:
            x, y = map(int, match.groups())
            if 0 <= x <= screen_width and 0 <= y <= screen_height:
                pyautogui.moveTo(x, y, duration=0.5)
                print(f"Moved to ({x}, {y})")

    elif "type" in command.lower():
        match = re.search(r'type\s*"(.+?)"', command, re.IGNORECASE)
        if match:
            text = match.group(1)
            pyautogui.write(text, interval=0.1)
            print(f"Typed: {text}")

    elif "no action needed" in command.lower():
        print("No action needed.")

    else:
        print("Unrecognized command:", command)

# Main loop
while True:
    user_prompt = input("\nEnter a command or describe what you want the AI to do: ")
    
    if user_prompt.lower() in ["exit", "quit"]:
        print("Exiting...")
        break
    
    print("\nAnalyzing screen...")
    model_response = analyze_screen(user_prompt)
    print("Model response:", model_response)
    
    execute_command(model_response)
    
    time.sleep(3)  # Adjust delay as needed
