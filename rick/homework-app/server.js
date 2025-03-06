const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const jwt = require("jsonwebtoken")
const sqlite3 = require("sqlite3").verbose()
const { open } = require("sqlite")

// Initialize express app
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.static("public"))

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Path to the JSON file that will store homework metadata
const homeworkDataPath = path.join(__dirname, 'homework-data.json');

// Initialize homework data file if it doesn't exist
if (!fs.existsSync(homeworkDataPath)) {
    fs.writeFileSync(homeworkDataPath, JSON.stringify({ homeworks: [] }));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({ storage })



// Database setup
// let db

// async function initializeDatabase() {
//   // Open the database
//   db = await open({
//     filename: path.join(__dirname, "database.sqlite"),
//     driver: sqlite3.Database,
//   })

//   // Create users table
//   await db.exec(`
//         CREATE TABLE IF NOT EXISTS users (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             username TEXT UNIQUE NOT NULL,
//             password TEXT NOT NULL,
//             createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
//         )
//     `)

//   // Create homework table
//   await db.exec(`
//         CREATE TABLE IF NOT EXISTS homework (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             userId INTEGER NOT NULL,
//             imagePath TEXT NOT NULL,
//             problemNumbers TEXT NOT NULL,
//             createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
//             FOREIGN KEY (userId) REFERENCES users (id)
//         )
//     `)

//   console.log("Database initialized")
// }

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Authentication required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" })
    }

    req.user = user
    next()
  })
}

// Helper function to read homework data
function readHomeworkData() {
    const data = fs.readFileSync(homeworkDataPath, 'utf8');
    return JSON.parse(data);
}

// Helper function to write homework data
function writeHomeworkData(data) {
    fs.writeFileSync(homeworkDataPath, JSON.stringify(data, null, 2));
}

// Routes

// Register user
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { username, password } = req.body

//     if (!username || !password) {
//       return res.status(400).json({ message: "Username and password are required" })
//     }

//     // Check if username already exists
//     const existingUser = await db.get("SELECT * FROM users WHERE username = ?", username)
//     if (existingUser) {
//       return res.status(409).json({ message: "Username already exists" })
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10)

//     // Insert user into database
//     const result = await db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword])

//     res.status(201).json({ message: "User registered successfully", userId: result.lastID })
//   } catch (error) {
//     console.error("Registration error:", error)
//     res.status(500).json({ message: "Server error" })
//   }
// })

// Login user
// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { username, password } = req.body

//     if (!username || !password) {
//       return res.status(400).json({ message: "Username and password are required" })
//     }

//     // Find user
//     const user = await db.get("SELECT * FROM users WHERE username = ?", username)
//     if (!user) {
//       return res.status(401).json({ message: "Invalid username or password" })
//     }

//     // Check password
//     const passwordMatch = await bcrypt.compare(password, user.password)
//     if (!passwordMatch) {
//       return res.status(401).json({ message: "Invalid username or password" })
//     }

//     // Generate JWT token
//     const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" })

//     res.json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         username: user.username,
//       },
//     })
//   } catch (error) {
//     console.error("Login error:", error)
//     res.status(500).json({ message: "Server error" })
//   }
// })

// Verify token
// app.get("/api/auth/verify", authenticateToken, (req, res) => {
//   res.json({
//     message: "Token is valid",
//     user: {
//       id: req.user.id,
//       username: req.user.username,
//     },
//   })
// })

// Upload homework
app.post('/api/homework', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image uploaded' });
        }
        
        const { problemNumbers } = req.body;
        if (!problemNumbers) {
            return res.status(400).json({ message: 'Problem numbers are required' });
        }
        
        // Parse problem numbers
        let parsedProblemNumbers;
        try {
            parsedProblemNumbers = JSON.parse(problemNumbers);
        } catch (e) {
            return res.status(400).json({ message: 'Invalid problem numbers format' });
        }
        
        // Read existing data
        const data = readHomeworkData();
        
        // Create new homework item
        const newHomework = {
            id: Date.now().toString(),
            imagePath: req.file.path,
            problemNumbers: parsedProblemNumbers,
            createdAt: new Date().toISOString()
        };
        
        // Add to array and save
        data.homeworks.push(newHomework);
        writeHomeworkData(data);
        
        res.status(201).json({
            message: 'Homework saved successfully',
            homework: {
                id: newHomework.id,
                problemNumbers: parsedProblemNumbers
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all homework
app.get('/api/homework', (req, res) => {
    try {
        const data = readHomeworkData();
        res.json({ homeworks: data.homeworks });
    } catch (error) {
        console.error('Get homework error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search homework by problem number
app.get('/api/homework/search', (req, res) => {
    try {
        const { problem } = req.query;
        
        if (!problem) {
            return res.status(400).json({ message: 'Problem number is required' });
        }
        
        // Get all homework
        const data = readHomeworkData();
        
        // Filter homeworks that contain the problem number
        const filteredHomeworks = data.homeworks.filter(hw => 
            hw.problemNumbers.includes(problem)
        );
        
        res.json({ homeworks: filteredHomeworks });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get homework image
app.get('/api/homework/image/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Get homework data
        const data = readHomeworkData();
        const homework = data.homeworks.find(hw => hw.id === id);
        
        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }
        
        // Send image file
        res.sendFile(path.resolve(homework.imagePath));
    } catch (error) {
        console.error('Get image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Download homework image
app.get('/api/homework/download/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Get homework data
        const data = readHomeworkData();
        const homework = data.homeworks.find(hw => hw.id === id);
        
        if (!homework) {
            return res.status(404).json({ message: 'Homework not found' });
        }
        
        // Set download headers
        res.download(
            path.resolve(homework.imagePath),
            `homework_${homework.problemNumbers.join('-')}_${new Date(homework.createdAt).toLocaleDateString()}.jpg`
        );
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete homework
app.delete('/api/homework/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Get homework data
        const data = readHomeworkData();
        const homeworkIndex = data.homeworks.findIndex(hw => hw.id === id);
        
        if (homeworkIndex === -1) {
            return res.status(404).json({ message: 'Homework not found' });
        }
        
        // Get the homework to delete
        const homeworkToDelete = data.homeworks[homeworkIndex];
        
        // Remove from array
        data.homeworks.splice(homeworkIndex, 1);
        writeHomeworkData(data);
        
        // Delete image file
        fs.unlink(homeworkToDelete.imagePath, (err) => {
            if (err) console.error('Error deleting file:', err);
        });
        
        res.json({ message: 'Homework deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
// async function startServer() {
//   try {
//     await initializeDatabase()
//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`)
//     })
//   } catch (error) {
//     console.error("Failed to start server:", error)
//   }
// }

// startServer()

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
