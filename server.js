const express = require('express');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

let dbInitialized = false;

async function initDB() {
  if (dbInitialized) return;
  dbInitialized = true;

  // Hanya buat tabel jika belum ada — tidak ada insert data dummy
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plants (
      id SERIAL PRIMARY KEY,
      nama TEXT,
      jenis TEXT,
      lokasi TEXT,
      jumlah INTEGER,
      kondisi TEXT,
      "desc" TEXT,
      foto TEXT,
      color TEXT
    );
    CREATE TABLE IF NOT EXISTS spots (
      id SERIAL PRIMARY KEY,
      x FLOAT,
      y FLOAT,
      "plantId" INTEGER,
      label TEXT
    );
    CREATE TABLE IF NOT EXISTS buildings (
      id SERIAL PRIMARY KEY,
      x FLOAT,
      y FLOAT,
      w FLOAT,
      h FLOAT,
      label TEXT,
      color TEXT,
      rotate FLOAT
    );
  `);

  console.log('✅ Database ready');
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Jalankan initDB sebelum setiap request
app.use(async (req, res, next) => {
  try { await initDB(); next(); }
  catch (err) { console.error('DB init error:', err); next(); }
});

// ─── API: Plants ──────────────────────────────────────────────────────────────
app.get('/api/plants', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plants ORDER BY id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/plants', async (req, res) => {
  try {
    const { nama, jenis, lokasi, jumlah, kondisi, desc, foto, color } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO plants (nama,jenis,lokasi,jumlah,kondisi,"desc",foto,color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [nama, jenis, lokasi, jumlah, kondisi, desc||'', foto||'', color||'#1D9E75']
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/plants/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // Ambil data lama dulu sebagai fallback
    const { rows: existing } = await pool.query('SELECT * FROM plants WHERE id=$1', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Not found' });
    const old = existing[0];

    const { nama, jenis, lokasi, jumlah, kondisi, desc, foto, color } = req.body;

    // Pakai nilai baru jika ada, fallback ke nilai lama
    const updNama    = (nama    !== undefined && nama    !== '') ? nama    : old.nama;
    const updJenis   = (jenis   !== undefined && jenis   !== '') ? jenis   : old.jenis;
    const updLokasi  = (lokasi  !== undefined && lokasi  !== '') ? lokasi  : old.lokasi;
    const updJumlah  = (jumlah  !== undefined && jumlah  !== null) ? jumlah : old.jumlah;
    const updKondisi = (kondisi !== undefined && kondisi !== '') ? kondisi : old.kondisi;
    const updDesc    = (desc    !== undefined) ? desc : (old.desc || '');
    const updColor   = (color   !== undefined && color   !== '') ? color   : old.color;
    const updFoto    = (foto    !== undefined && foto    !== '') ? foto    : (old.foto || '');

    const { rows } = await pool.query(
      'UPDATE plants SET nama=$1,jenis=$2,lokasi=$3,jumlah=$4,kondisi=$5,"desc"=$6,foto=$7,color=$8 WHERE id=$9 RETURNING *',
      [updNama, updJenis, updLokasi, updJumlah, updKondisi, updDesc, updFoto, updColor, id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/plants/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM plants WHERE id=$1', [req.params.id]);
    await pool.query('DELETE FROM spots WHERE "plantId"=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── API: Photo Upload ────────────────────────────────────────────────────────
app.post('/api/plants/:id/foto', upload.single('foto'), async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'satoria-plants', resource_type: 'image' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });
    await pool.query('UPDATE plants SET foto=$1 WHERE id=$2', [result.secure_url, req.params.id]);
    res.json({ foto: result.secure_url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Gagal upload foto' });
  }
});

// ─── API: Spots ───────────────────────────────────────────────────────────────
app.get('/api/spots', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM spots ORDER BY id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/spots', async (req, res) => {
  try {
    const { x, y, plantId, label } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO spots (x,y,"plantId",label) VALUES ($1,$2,$3,$4) RETURNING *',
      [x, y, plantId, label]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/spots/:id', async (req, res) => {
  try {
    const { x, y, plantId, label } = req.body;
    const { rows } = await pool.query(
      'UPDATE spots SET x=$1,y=$2,"plantId"=$3,label=$4 WHERE id=$5 RETURNING *',
      [x, y, plantId, label, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/spots', async (req, res) => {
  try {
    const spots = req.body;
    for (const s of spots) {
      await pool.query(
        'UPDATE spots SET x=$1,y=$2,"plantId"=$3,label=$4 WHERE id=$5',
        [s.x, s.y, s.plantId, s.label, s.id]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/spots/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM spots WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── API: Buildings ───────────────────────────────────────────────────────────
app.get('/api/buildings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM buildings ORDER BY id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/buildings', async (req, res) => {
  try {
    const buildings = req.body;
    await pool.query('DELETE FROM buildings');
    for (const b of buildings) {
      await pool.query(
        'INSERT INTO buildings (x,y,w,h,label,color,rotate) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [b.x, b.y, b.w, b.h, b.label, b.color, b.rotate]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Catch-all ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 Satoria Plant Monitoring`);
  console.log(`   Server berjalan di: http://localhost:${PORT}\n`);
});
