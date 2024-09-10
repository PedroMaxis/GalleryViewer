const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Promisify fs methods for easier async/await usage
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

// Create an Express app
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(cors({ origin: 'https://gallery-viewer-5i4v.vercel.app' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define the storage configuration for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

let data = [];  // Use 'let' to allow reassigning

// Define the route to upload files
app.post('/upload', upload.single('image'), (req, res) => {
    const { name } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    const newItem = { name, imageUrl };
    
    data.push(newItem);
    res.json(newItem);
});

// Define the route to get all items
app.get('/items', (req, res) => {
    res.json(data);
});

// Function to clean the uploads directory
async function cleanUploadsDirectory() {
    try {
        const files = await readdir('uploads');
        for (const file of files) {
            const filePath = path.join('uploads', file);
            await unlink(filePath);  // Delete file
        }
        // Optionally, remove the directory itself if empty
        // await rmdir('uploads');
    } catch (error) {
        console.error('Error cleaning uploads directory:', error);
    }
}

// Function to clear the data array
function clearDataArray() {
    data = [];  // Clear the existing records
}

// Start the server and clean uploads directory
app.listen(PORT, async () => {
    await cleanUploadsDirectory();
    clearDataArray();  // Clear the data array
    console.log(`Server rodando em http://localhost:${PORT}`);
});
