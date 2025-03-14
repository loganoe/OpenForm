from transformers import AutoModelForCausalLM, AutoProcessor, GenerationConfig
from PIL import Image
import sys
import base64
from io import BytesIO

# Load the processor and model
processor = AutoProcessor.from_pretrained(
    'allenai/Molmo-7B-D-0924',
    trust_remote_code=True,
    torch_dtype='auto',
    device_map='auto'
)

model = AutoModelForCausalLM.from_pretrained(
    'allenai/Molmo-7B-D-0924',
    trust_remote_code=True,
    torch_dtype='auto',
    device_map='auto'
)

def process_image_and_generate(base64_image, prompt):
    # Decode the image from base64
    image_data = base64.b64decode(base64_image)
    image = Image.open(BytesIO(image_data))

    # Process the image and text prompt
    inputs = processor.process(
        images=[image],
        text=prompt
    )

    # Move inputs to the correct device
    inputs = {k: v.to(model.device).unsqueeze(0) for k, v in inputs.items()}

    # Generate output
    output = model.generate_from_batch(
        inputs,
        GenerationConfig(max_new_tokens=200, stop_strings="<|endoftext|>"),
        tokenizer=processor.tokenizer
    )

    # Decode the output
    generated_tokens = output[0, inputs['input_ids'].size(1):]
    generated_text = processor.tokenizer.decode(generated_tokens, skip_special_tokens=True)

    return generated_text

# Read the image (base64) and prompt from the command line arguments
if __name__ == "__main__":
    base64_image = sys.argv[1]
    prompt = sys.argv[2]

    response = process_image_and_generate(base64_image, prompt)
    print(response)
