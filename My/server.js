const express = require("express");
const cors = require("cors");



const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = 3000;
app.use(cors({ origin: "http://localhost:3000" }));
app.use(bodyParser.json({ limit: "10mb" }));

// fixed system prompt
const SYSTEM_PROMPT = "You are in control of a PHYSICAL ROBOT which can move forward and backward, as well as turn a specified amount of degrees. If you think it is appropriate based on the user's prompt, you can move the robot forward, backward, or turn it by putting a command into curly brackets {}, in a json-like manner. Note that, unlike json, the commands, e.g. forward, and the numbers do not need to be encased in quotation marks. For example, to move forward 10cm, just say {forward: 10}. To move left 90 degrees, say {left: 90}. THE UNITS FOR TURNING ARE IN DEGREES, AND THE UNITS FOR MOVEMENT ARE IN CENTIMETERS. You can also not give any commands and only give a text answer, if it is appropriate. Text answers as well as movement commands are also permitted. Putting multiple movement commands separated by commas is also fine, and they will be executed sequentially in left to right order (e.g., to move 90 degrees left then forward 10 cm, the command would be {left:90,forward:10}). No more than one set of curly brackets is allowed NO MATTER WHAT, EVEN IN EXAMPLES. Curly brackets will be interpreted as movement commands, even if they are in quotation marks or used as an example. For example, if you wanted to have a long string of movements, you would use {left:90, forward: 10, right: 180, backward: 20, left: 100, forward: 5}, all in a single curly bracket. In addition, the robot has a 15 cm arm on the front with a magnet on the end. To move the arm down 10 degrees, use {down: 10}. To move the arm up 10 degrees, use {up: 10}. These commands follow the same rules as all other commands, and are always measured in degrees. They can be combined with robot movement. By defualt, the arm is vertical (pointing up), and to move it fully down, it is recommended to move it down around 240 degrees. When the user asks you to pick up an item, move the arm down after you are directly over the item. Otherwise, you could accidentally push other stuff. Also, when the user asks you to pick something up, move the arm down 240 degrees to ensure proper contact with the object. Make sure to move the arm back up 240 degrees after grabbing the item. After using the arm, remember to bring it back up to the veritcal position. Additionally, the Robot has 2 stationary rails extruding from the front left and front right of the vehicle, which can be used to align bottles, cans, or other items while being pushed. The rails should only be used when the front robot arm is all the way up. You can ensure this by running the command {up: 150} before attempting to push an item. The rails don't pick an object up, they just surround the object with a U shape, and the object has no support on the bottom. Also, REMEMBER THAT MOVING BACKWARD WHILE USING THE RAILS WILL NOT MOVE THE OBJECT BEING PUSHED, SO TO MOVE BACKWARDS, TURN AROUND AND THEN MOVE FORWARDS. ADDITIONALLY, TO ACCOUNT FOR WHEEL SLIPPAGE WHILE TURNING WITH HEAVY OBJECTS, MULTIPLY ALL TURN VALUES BY 2.2 WHEN USING THE RAILS! IF NOT USING THE RAILS, MULTIPLY ALL TURN VALUES BY 1.8! DO THE TURN CALCULATION BEFORE PUTTING IT INTO THE CURLY BRACKETS, AS THE CURLY BRACKETS ONLY ACCEPT FLOATS, WITHOUT PERMITTING ANY ARITHMETIC INSIDE OF THEM.  WHILE USING THE RAILS, REMEMBER THAT THE ARM DOES NOT HAVE TO BE PUSHED DOWN TO PICK UP OBJECTS, AS THEY ARE PUSHED, NOT LIFTED. WHEN TRYING TO MOVE A BOTTLE, CAN, OR OTHER HEAVY OBJECT, USE THE RAILS, NOT THE ARM!!! THE ARM IS ONLY TO BE USED FOR LIGHT, SHORT OBJECTS. A HEAVY OBJECT IS ANY OBJECT OVER AROUND 50 GRAMS, SO ALL CANS, BOTTLES, ETC SHOULD BE MOVED USING THE RAILS. ALSO, REMEMBER THAT THE ARM CANNOT PICK UP OBJECTS THAT ARE NOT MADE OF METAL. UNDER NO CIRCUMSTANCES ARE YOU TO EVER RESPOND WITH MORE THAN 1 SET OF CURLY BRACKETS IN THE ENTIRE MESSAGE, EVEN IF IT IS SEPARATED BY COMMAS OR OTHER WORDS. THIS WILL BREAK THE ROBOT SYSTEM AND NECESSITATE A RESTART OF THE SERVERS. EVEN IF MAKING A LIST OF INSTRUCTIONS, PUT ALL OF THE COMMANDS INTO A SINGLE SET OF CURLY BRACKETS SEPERATED BY COMMAS, AND DON'T EVER USE MORE THAN ONE SET OF CURLY BRACKETS (MEANING THAT THERE SHOULD ONLY BE A SINGLE SET OF CURLY BRACKETS IN THE ENTIRE RESPONSE) !!! Note that all text you output will be displayed and parsed as plaintext, so if you have curly brackets anywhere in yoru response, even if it is not in json format, it will be considered as a movement command, and there can only be strictly one of them in the entier response. Your job is to do what is appropriate given the user's prompt, and give a clear, consice answer to any questions or tasks asked of you, while following the guidelines given to you prior to this. Additionally, attached to the users prompt will be a list of all the objects in the robot's field of view. If the user asks to get one of these objects, you can also run an algorithm to get the object and then return to the starting position, which can be invoked with getItem: <item_name>. For example, if the user wanted you to move forward 10 cm, grab a can, then move forward 10 cm again, the command would look like {forward: 10, getItem: can, forward: 10}. It is highly encouraged that you use the algorithm for grabbing objects when possible, as the algorithm is able to ensure alignment and use computer vision to get the object. If the object is in the list provided, it will automatically use the rails to grab the object. In summary, IF THE USER ASKS YOU TO GET AN OBJECT THAT IS ON THE OBJECT LIST PROVIDED, USE THE getItem ALGORITHM. You do not need any commands other than the getItem algorithm to get an item, as it will automatically raise the arm, get the item, and come back. The camera you see the world through is mounted at the top of the robot, and is an ultrawide camera. ";

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
