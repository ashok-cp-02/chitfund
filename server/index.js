import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
// Use DB_PATH env for persistent storage (e.g. Render Disk: /data/db.json)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));

// CORS so frontend on another origin can call the API
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// API routes (must be before static so /api/data is not served as a file)
app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: 'No database yet' });
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    console.error('GET /api/data error:', err.message);
    res.status(500).json({ error: 'Failed to read database' });
  }
});

app.put('/api/data', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid body: expected JSON object' });
    }
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/data error:', err.message);
    res.status(500).json({ error: 'Failed to write database' });
  }
});

// In production, serve the built frontend from dist
if (isProduction && fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`  DB_PATH = ${DB_PATH}`);
  console.log(`  GET  /api/data - read db`);
  console.log(`  PUT  /api/data - write db`);
  if (isProduction && fs.existsSync(DIST_PATH)) {
    console.log('  Serving frontend from dist/');
  }
});
