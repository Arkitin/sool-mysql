const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const path = require("path");
const AWS = require("aws-sdk");
const multer = require("multer");
const bcrypt = require("bcrypt");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL Database!");

    // Auto-create 'users' table if it doesn't exist
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
        )
    `;
    db.query(createTableQuery, (err) => {
        if (err) console.error("Table creation error:", err);
    });
});

// AWS S3 setup
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const s3 = new AWS.S3();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// User Registration route
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    // Check if email already exists
    const emailCheckQuery = "SELECT * FROM users WHERE email = ?";
    db.query(emailCheckQuery, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        db.query(query, [name, email, hashedPassword], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(200).json({ message: "User registered successfully!" });
        });
    });
});

// User Login route
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length > 0) {
            const isPasswordValid = await bcrypt.compare(password, results[0].password);
            if (isPasswordValid) {
                res.status(200).json({ message: "Login successful", user: results[0] });
            } else {
                res.status(401).json({ error: "Invalid email or password" });
            }
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    });
});

// File upload route to S3
app.post("/upload", upload.single("file"), (req, res) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: req.file.originalname,
        Body: req.file.buffer,
    };

    s3.upload(params, (err, data) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ message: `File uploaded successfully: ${data.Location}` });
    });
});

// Get files from S3 bucket
app.get("/files", (req, res) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
    };

    s3.listObjectsV2(params, (err, data) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(200).json(data.Contents);
    });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});