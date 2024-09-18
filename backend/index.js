const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sqlite3 = require('sqlite3').verbose();

const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS cad_imagem (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        img_name TEXT NOT NULL,
        img_url TEXT NOT NULL
    )
`);

// Rota de upload
app.post('/upload', upload.single('image'), (req, res) => {
    const { name } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    
    let query = `INSERT INTO cad_imagem (img_name, img_url) VALUES (?, ?)`;
    db.run(query, [name, imageUrl], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
        }

        const newItem = { id: this.lastID, name, imageUrl };
        res.json(newItem);
    });
});

// Rota para obter todos os itens
app.get('/items', (req, res) => {
    const query = `SELECT * FROM cad_imagem`;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao recuperar os dados.' });
        }
        res.json(rows);
    });
});

async function cleanUploadsDirectory() {
    try {
        const files = await readdir('uploads');
        for (const file of files) {
            const filePath = path.join('uploads', file);
            await unlink(filePath);  
        }
    } catch (error) {
        console.error('Error cleaning uploads directory:', error);
    }
}

app.listen(PORT, async () => {
    await cleanUploadsDirectory();
    console.log(`Server rodando em http://localhost:${PORT}`);
});
