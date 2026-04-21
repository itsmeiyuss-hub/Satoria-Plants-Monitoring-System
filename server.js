const express = require('express');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Database Config ──────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── Init Database Tables ─────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plants (
      id SERIAL PRIMARY KEY,
      nama TEXT, jenis TEXT, lokasi TEXT,
      jumlah INTEGER, kondisi TEXT, desc TEXT,
      foto TEXT, color TEXT
    );
    CREATE TABLE IF NOT EXISTS spots (
      id SERIAL PRIMARY KEY,
      x FLOAT, y FLOAT, "plantId" INTEGER, label TEXT
    );
    CREATE TABLE IF NOT EXISTS buildings (
      id SERIAL PRIMARY KEY,
      x FLOAT, y FLOAT, w FLOAT, h FLOAT,
      label TEXT, color TEXT, rotate FLOAT
    );
  `);

  // Insert default data if empty
  const { rows: plants } = await pool.query('SELECT id FROM plants LIMIT 1');
  if (plants.length === 0) {
    const defaultPlants = [
      ['Walisongo','Schefflera arboricola','Area Taman',10,'Baik','','','#1D9E75'],
      ['Daun Pucuk Merah','Syzygium myrtifolium Walp.','Taman Depan',15,'Baik','','','#639922'],
      ['Lotus','Nelumbo nucifera','Kolam',5,'Baik','','','#0F6E56'],
      ['Mawar Jambe','Cycas sp','Area Kantor',8,'Baik','','','#3B6D11'],
      ['Kaki Gajah','genus Adansonia','Area Luar',3,'Baik','','','#9FE1CB'],
      ['Canna Lily','Canna indica','Taman Tengah',20,'Baik','','','#FAC775'],
      ['Pohon Asoka','Saraca Indica','Gerbang Masuk',6,'Baik','','','#97C459'],
      ['Bunga Mondokaki','Tabernaemontana divaricata','Taman Samping',12,'Baik','','','#D4537E'],
      ['Pohon Naga','Dracaena marginata','Lobby',4,'Baik','','','#5B9CF2'],
      ['Pohon Hujan','Spathodea campanulata','Jalan Utama',7,'Perlu Perawatan','','','#F2B851'],
      ['Sambang Darah','Excoecaria cochinchinensis','Pagar Timur',25,'Baik','','','#E05C5C'],
      ['Lili Semak','Clivia miniata','Taman Indoor',9,'Baik','','','#B5A4E0'],
      ['Tanaman Puring','Codiaeum variegatum','Area Produksi',30,'Baik','','','#7FB5A8'],
      ['Palem Lontar','Borassus flabellifer','Area Parkir',5,'Baik','','','#C68A3E'],
    ];
    for (const p of defaultPlants) {
      await pool.query('INSERT INTO plants (nama,jenis,lokasi,jumlah,kondisi,desc,foto,color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', p);
    }
  }

  const { rows: spots } = await pool.query('SELECT id FROM spots LIMIT 1');
  if (spots.length === 0) {
    const defaultSpots = [
      [80,80,1,'Taman Depan'],[200,60,2,'Area Kantor'],[680,90,3,'Kolam'],
      [760,200,4,'Area Samping'],[140,200,5,'Pintu Masuk'],[620,320,6,'WWTP'],
      [400,390,7,'Gerbang'],[80,370,8,'Taman Sisi'],[300,180,9,'Lobby'],
      [500,140,10,'Jalan Utama'],[240,350,11,'Pagar Timur'],[730,400,12,'Taman Indoor'],
      [450,260,13,'Produksi'],[560,420,14,'Parkir'],
    ];
    for (const s of defaultSpots) {
      await pool.query('INSERT INTO spots (x,y,"plantId",label) VALUES ($1,$2,$3,$4)', s);
    }
  }

  const { rows: buildings } = await pool.query('SELECT id FROM buildings LIMIT 1');
  if (buildings.length === 0) {
    const defaultBuildings = [
      [30,30,160,80,'Kantor Utama','#B5D4F4',0],[210,30,120,60,'Gudang FG 1','#C0DD97',0],
      [340,30,100,50,'Lab QC','#FAC775',0],[30,130,130,100,'Workshop','#F5C4B3',0],
      [170,110,180,90,'Pharma Plant','#B5D4F4',0],[360,100,150,120,'WH Raw Mat','#C0DD97',0],
      [520,30,140,80,'Powder Plant','#FAC775',0],[520,120,200,100,'Biscuit Plant','#F5C4B3',0],
      [670,30,120,80,'Flavour Plant','#D3D1C7',0],[30,250,200,110,'Gudang FG 3','#C0DD97',0],
      [240,220,160,130,'WWTP','#9FE1CB',0],[410,240,250,120,'Lapangan','#EAF3DE',0],
      [30,380,160,80,'Gerbang & Pos','#D3D1C7',0],[200,370,100,80,'Musholla','#EEEDFE',0],
      [660,240,170,120,'Gudang Spare','#FAC775',0],[450,380,100,80,'Genset','#F5C4B3',0],
      [560,370,120,90,'Cooling Tower','#B5D4F4',0],[700,370,140,80,'Boiler Room','#F0997B',0],
    ];
    for (const b of defaultBuildings) {
      await pool.query('INSERT INTO buildings (x,y,w,h,label,color,rotate) VALUES ($1,$2,$3,$4,$5,$6,$7)', b);
    }
  }

  console.log('✅ Database ready');
}

// ─── Multer ───────────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── API: Plants ──────────────────────────────────────────────────────────────
app.get('/api/plants', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM plants ORDER BY id');
  res.json(rows);
});

app.post('/api/plants', async (req, res) => {
  const { nama,jenis,lokasi,jumlah,kondisi,desc,foto,color } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO plants (nama,jenis,lokasi,jumlah,kondisi,desc,foto,color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [nama,jenis,lokasi,jumlah,kondisi,desc||'',foto||'',color||'#1D9E75']
  );
  res.json(rows[0]);
});

app.put('/api/plants/:id', async (req, res) => {
  const { nama,jenis,lokasi,jumlah,kondisi,desc,foto,color } = req.body;
  const { rows } = await pool.query(
    'UPDATE plants SET nama=$1,jenis=$2,lokasi=$3,jumlah=$4,kondisi=$5,desc=$6,foto=$7,color=$8 WHERE id=$9 RETURNING *',
    [nama,jenis,lokasi,jumlah,kondisi,desc||'',foto||'',color||'#1D9E75',req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/plants/:id', async (req, res) => {
  await pool.query('DELETE FROM plants WHERE id=$1', [req.params.id]);
  await pool.query('DELETE FROM spots WHERE "plantId"=$1', [req.params.id]);
  res.json({ ok: true });
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
  const { rows } = await pool.query('SELECT * FROM spots ORDER BY id');
  res.json(rows);
});

app.post('/api/spots', async (req, res) => {
  const { x,y,plantId,label } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO spots (x,y,"plantId",label) VALUES ($1,$2,$3,$4) RETURNING *',
    [x,y,plantId,label]
  );
  res.json(rows[0]);
});

app.put('/api/spots/:id', async (req, res) => {
  const { x,y,plantId,label } = req.body;
  const { rows } = await pool.query(
    'UPDATE spots SET x=$1,y=$2,"plantId"=$3,label=$4 WHERE id=$5 RETURNING *',
    [x,y,plantId,label,req.params.id]
  );
  res.json(rows[0]);
});

app.put('/api/spots', async (req, res) => {
  const spots = req.body;
  for (const s of spots) {
    await pool.query(
      'UPDATE spots SET x=$1,y=$2,"plantId"=$3,label=$4 WHERE id=$5',
      [s.x,s.y,s.plantId,s.label,s.id]
    );
  }
  res.json({ ok: true });
});

app.delete('/api/spots/:id', async (req, res) => {
  await pool.query('DELETE FROM spots WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── API: Buildings ───────────────────────────────────────────────────────────
app.get('/api/buildings', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM buildings ORDER BY id');
  res.json(rows);
});

app.put('/api/buildings', async (req, res) => {
  const buildings = req.body;
  await pool.query('DELETE FROM buildings');
  for (const b of buildings) {
    await pool.query(
      'INSERT INTO buildings (x,y,w,h,label,color,rotate) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [b.x,b.y,b.w,b.h,b.label,b.color,b.rotate]
    );
  }
  res.json({ ok: true });
});

// ─── Catch-all ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🌿 Satoria Plant Monitoring`);
    console.log(`   Server berjalan di: http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Database error:', err);
  process.exit(1);
});
