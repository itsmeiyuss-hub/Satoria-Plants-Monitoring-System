const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Paths ────────────────────────────────────────────────────────────────────
const DATA_FILE  = path.join(__dirname, 'data', 'plants.json');
const SPOTS_FILE = path.join(__dirname, 'data', 'spots.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// ─── Ensure directories & default data files exist ───────────────────────────
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DEFAULT_PLANTS = [
  {id:1,  nama:'Walisongo',        jenis:'Schefflera arboricola',         lokasi:'Area Taman',     jumlah:10, kondisi:'Baik',            desc:'', foto:'', color:'#1D9E75'},
  {id:2,  nama:'Daun Pucuk Merah', jenis:'Syzygium myrtifolium Walp.',    lokasi:'Taman Depan',    jumlah:15, kondisi:'Baik',            desc:'', foto:'', color:'#639922'},
  {id:3,  nama:'Lotus',            jenis:'Nelumbo nucifera',              lokasi:'Kolam',          jumlah:5,  kondisi:'Baik',            desc:'', foto:'', color:'#0F6E56'},
  {id:4,  nama:'Mawar Jambe',      jenis:'Cycas sp',                      lokasi:'Area Kantor',    jumlah:8,  kondisi:'Baik',            desc:'', foto:'', color:'#3B6D11'},
  {id:5,  nama:'Kaki Gajah',       jenis:'genus Adansonia',               lokasi:'Area Luar',      jumlah:3,  kondisi:'Baik',            desc:'', foto:'', color:'#9FE1CB'},
  {id:6,  nama:'Canna Lily',       jenis:'Canna indica',                  lokasi:'Taman Tengah',   jumlah:20, kondisi:'Baik',            desc:'', foto:'', color:'#FAC775'},
  {id:7,  nama:'Pohon Asoka',      jenis:'Saraca Indica',                 lokasi:'Gerbang Masuk',  jumlah:6,  kondisi:'Baik',            desc:'', foto:'', color:'#97C459'},
  {id:8,  nama:'Bunga Mondokaki',  jenis:'Tabernaemontana divaricata',    lokasi:'Taman Samping',  jumlah:12, kondisi:'Baik',            desc:'', foto:'', color:'#D4537E'},
  {id:9,  nama:'Pohon Naga',       jenis:'Dracaena marginata',            lokasi:'Lobby',          jumlah:4,  kondisi:'Baik',            desc:'', foto:'', color:'#5B9CF2'},
  {id:10, nama:'Pohon Hujan',      jenis:'Spathodea campanulata',         lokasi:'Jalan Utama',    jumlah:7,  kondisi:'Perlu Perawatan', desc:'', foto:'', color:'#F2B851'},
  {id:11, nama:'Sambang Darah',    jenis:'Excoecaria cochinchinensis',    lokasi:'Pagar Timur',    jumlah:25, kondisi:'Baik',            desc:'', foto:'', color:'#E05C5C'},
  {id:12, nama:'Lili Semak',       jenis:'Clivia miniata',                lokasi:'Taman Indoor',   jumlah:9,  kondisi:'Baik',            desc:'', foto:'', color:'#B5A4E0'},
  {id:13, nama:'Tanaman Puring',   jenis:'Codiaeum variegatum',           lokasi:'Area Produksi',  jumlah:30, kondisi:'Baik',            desc:'', foto:'', color:'#7FB5A8'},
  {id:14, nama:'Palem Lontar',     jenis:'Borassus flabellifer',          lokasi:'Area Parkir',    jumlah:5,  kondisi:'Baik',            desc:'', foto:'', color:'#C68A3E'},
];

const DEFAULT_SPOTS = [
  {id:1,  x:80,  y:80,  plantId:1,  label:'Taman Depan'},
  {id:2,  x:200, y:60,  plantId:2,  label:'Area Kantor'},
  {id:3,  x:680, y:90,  plantId:3,  label:'Kolam'},
  {id:4,  x:760, y:200, plantId:4,  label:'Area Samping'},
  {id:5,  x:140, y:200, plantId:5,  label:'Pintu Masuk'},
  {id:6,  x:620, y:320, plantId:6,  label:'WWTP'},
  {id:7,  x:400, y:390, plantId:7,  label:'Gerbang'},
  {id:8,  x:80,  y:370, plantId:8,  label:'Taman Sisi'},
  {id:9,  x:300, y:180, plantId:9,  label:'Lobby'},
  {id:10, x:500, y:140, plantId:10, label:'Jalan Utama'},
  {id:11, x:240, y:350, plantId:11, label:'Pagar Timur'},
  {id:12, x:730, y:400, plantId:12, label:'Taman Indoor'},
  {id:13, x:450, y:260, plantId:13, label:'Produksi'},
  {id:14, x:560, y:420, plantId:14, label:'Parkir'},
];

if (!fs.existsSync(DATA_FILE))  fs.writeFileSync(DATA_FILE,  JSON.stringify(DEFAULT_PLANTS, null, 2));
if (!fs.existsSync(SPOTS_FILE)) fs.writeFileSync(SPOTS_FILE, JSON.stringify(DEFAULT_SPOTS,  null, 2));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

// ─── Multer (foto upload) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `plant_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(PUBLIC_DIR));

// ─── API: Plants ──────────────────────────────────────────────────────────────
app.get('/api/plants', (req, res) => {
  res.json(readJSON(DATA_FILE));
});

app.post('/api/plants', (req, res) => {
  const plants = readJSON(DATA_FILE);
  const plant = { id: nextId(plants), ...req.body };
  plants.push(plant);
  writeJSON(DATA_FILE, plants);
  res.json(plant);
});

app.put('/api/plants/:id', (req, res) => {
  const plants = readJSON(DATA_FILE);
  const idx = plants.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  plants[idx] = { ...plants[idx], ...req.body, id: plants[idx].id };
  writeJSON(DATA_FILE, plants);
  res.json(plants[idx]);
});

app.delete('/api/plants/:id', (req, res) => {
  let plants = readJSON(DATA_FILE);
  const id = parseInt(req.params.id);
  plants = plants.filter(p => p.id !== id);
  writeJSON(DATA_FILE, plants);

  // Remove spots linked to this plant
  let spots = readJSON(SPOTS_FILE);
  spots = spots.filter(s => s.plantId !== id);
  writeJSON(SPOTS_FILE, spots);

  res.json({ ok: true });
});

// ─── API: Photo upload ────────────────────────────────────────────────────────
app.post('/api/plants/:id/foto', upload.single('foto'), (req, res) => {
  const plants = readJSON(DATA_FILE);
  const idx = plants.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  // Delete old foto file if exists
  if (plants[idx].foto) {
    const oldPath = path.join(PUBLIC_DIR, plants[idx].foto);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const fotoUrl = `/uploads/${req.file.filename}`;
  plants[idx].foto = fotoUrl;
  writeJSON(DATA_FILE, plants);
  res.json({ foto: fotoUrl });
});

// ─── API: Map Spots ───────────────────────────────────────────────────────────
app.get('/api/spots', (req, res) => {
  res.json(readJSON(SPOTS_FILE));
});

app.post('/api/spots', (req, res) => {
  const spots = readJSON(SPOTS_FILE);
  const spot = { id: nextId(spots), ...req.body };
  spots.push(spot);
  writeJSON(SPOTS_FILE, spots);
  res.json(spot);
});

app.put('/api/spots/:id', (req, res) => {
  const spots = readJSON(SPOTS_FILE);
  const idx = spots.findIndex(s => s.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  spots[idx] = { ...spots[idx], ...req.body, id: spots[idx].id };
  writeJSON(SPOTS_FILE, spots);
  res.json(spots[idx]);
});

app.put('/api/spots', (req, res) => {
  // Bulk update (save all spots at once after drag)
  writeJSON(SPOTS_FILE, req.body);
  res.json({ ok: true });
});

app.delete('/api/spots/:id', (req, res) => {
  let spots = readJSON(SPOTS_FILE);
  spots = spots.filter(s => s.id !== parseInt(req.params.id));
  writeJSON(SPOTS_FILE, spots);
  res.json({ ok: true });
});

// ─── API: Buildings Layout ────────────────────────────────────────────────────
const BUILDINGS_FILE = path.join(__dirname, 'data', 'buildings.json');

const DEFAULT_BUILDINGS = [
  {x:30, y:30, w:160,h:80,  label:'Kantor Utama',  color:'#B5D4F4', rotate:0},
  {x:210,y:30, w:120,h:60,  label:'Gudang FG 1',   color:'#C0DD97', rotate:0},
  {x:340,y:30, w:100,h:50,  label:'Lab QC',        color:'#FAC775', rotate:0},
  {x:30, y:130,w:130,h:100, label:'Workshop',      color:'#F5C4B3', rotate:0},
  {x:170,y:110,w:180,h:90,  label:'Pharma Plant',  color:'#B5D4F4', rotate:0},
  {x:360,y:100,w:150,h:120, label:'WH Raw Mat',    color:'#C0DD97', rotate:0},
  {x:520,y:30, w:140,h:80,  label:'Powder Plant',  color:'#FAC775', rotate:0},
  {x:520,y:120,w:200,h:100, label:'Biscuit Plant', color:'#F5C4B3', rotate:0},
  {x:670,y:30, w:120,h:80,  label:'Flavour Plant', color:'#D3D1C7', rotate:0},
  {x:30, y:250,w:200,h:110, label:'Gudang FG 3',   color:'#C0DD97', rotate:0},
  {x:240,y:220,w:160,h:130, label:'WWTP',          color:'#9FE1CB', rotate:0},
  {x:410,y:240,w:250,h:120, label:'Lapangan',      color:'#EAF3DE', rotate:0},
  {x:30, y:380,w:160,h:80,  label:'Gerbang & Pos', color:'#D3D1C7', rotate:0},
  {x:200,y:370,w:100,h:80,  label:'Musholla',      color:'#EEEDFE', rotate:0},
  {x:660,y:240,w:170,h:120, label:'Gudang Spare',  color:'#FAC775', rotate:0},
  {x:450,y:380,w:100,h:80,  label:'Genset',        color:'#F5C4B3', rotate:0},
  {x:560,y:370,w:120,h:90,  label:'Cooling Tower', color:'#B5D4F4', rotate:0},
  {x:700,y:370,w:140,h:80,  label:'Boiler Room',   color:'#F0997B', rotate:0},
];

if (!fs.existsSync(BUILDINGS_FILE)) fs.writeFileSync(BUILDINGS_FILE, JSON.stringify(DEFAULT_BUILDINGS, null, 2));

app.get('/api/buildings', (req, res) => {
  res.json(readJSON(BUILDINGS_FILE));
});

app.put('/api/buildings', (req, res) => {
  writeJSON(BUILDINGS_FILE, req.body);
  res.json({ ok: true });
});

// ─── Catch-all → index.html ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 Satoria Plant Monitoring`);
  console.log(`   Server berjalan di: http://localhost:${PORT}\n`);
});
