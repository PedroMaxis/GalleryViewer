const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Configurar o multer para armazenar imagens na memória
const storage = multer.memoryStorage();
const upload = multer({ storage });

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criar tabela no SQLite
db.run(`
    CREATE TABLE IF NOT EXISTS cad_imagem (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        img_name TEXT NOT NULL,
        img_data BLOB NOT NULL
    )
`);

// Rota de upload
app.post('/upload', upload.single('image'), (req, res) => {
    const { name } = req.body;
    const imageBuffer = req.file.buffer; // O arquivo está em memória (Buffer)

    const query = `INSERT INTO cad_imagem (img_name, img_data) VALUES (?, ?)`;
    db.run(query, [name, imageBuffer], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
        }

        const newItem = { id: this.lastID, name };
        res.json(newItem);
    });
});

// Rota para obter todos os itens
app.get('/items', (req, res) => {
    const query = `SELECT id, img_name FROM cad_imagem`;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao recuperar os dados.' });
        }
        res.json(rows);
    });
});

// Rota para obter uma imagem específica
app.get('/items/:id', (req, res) => {
    const { id } = req.params;

    const query = `SELECT img_data FROM cad_imagem WHERE id = ?`;
    db.get(query, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao recuperar a imagem.' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Imagem não encontrada.' });
        }

        res.set('Content-Type', 'image/jpeg'); // Ajuste conforme o tipo do arquivo
        res.send(row.img_data); // Retorna o buffer como resposta
    });
});

app.listen(PORT, () => {
    console.log(`Server rodando em http://localhost:${PORT}`);
});
