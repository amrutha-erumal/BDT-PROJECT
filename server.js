import express from 'express';
import multer from 'multer';
import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'data', 'banking_transactions.csv');
const ACTIVE_DATA_PATH = path.join(__dirname, 'data', 'active_transactions.csv');
const DIST_DIR = path.join(__dirname, 'dist');

const REQUIRED = [
  'Transaction_ID',
  'Customer_ID',
  'Transaction_Date',
  'Transaction_Type',
  'Amount',
  'Location',
  'Status',
];
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);
const APP_VERSION = '1.1.0';

function formatYmd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateValue(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : formatYmd(val);
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    // Excel serial date number (epoch 1899-12-30)
    const utcMs = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    return Number.isNaN(d.getTime()) ? null : formatYmd(d);
  }
  const str = String(val).trim();
  if (!str) return null;
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(dt.getTime())) return formatYmd(dt);
  }
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatYmd(parsed);
}

function parseRowsFromBuffer(filename, buffer) {
  const ext = path.extname(filename || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('Unsupported file type. Upload CSV or Excel (.xlsx/.xls).');
  }
  if (ext === '.csv') {
    const text = buffer.toString('utf-8');
    return parseCsv(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  }
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error('Uploaded Excel workbook contains no sheets.');
  }
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    raw: true,
    defval: '',
  });
}

function normalizeRecords(rawRows) {
  const aliases = {};
  for (const col of REQUIRED) {
    aliases[col.toLowerCase().replace(/ /g, '_')] = col;
  }

  const sampleKeys = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const renameMap = {};
  const mappedTargets = new Set();

  for (const origKey of sampleKeys) {
    const normalizedKey = String(origKey)
      .trim()
      .toLowerCase()
      .replace(/-/g, '_')
      .replace(/ /g, '_');
    if (aliases[normalizedKey]) {
      renameMap[origKey] = aliases[normalizedKey];
      mappedTargets.add(aliases[normalizedKey]);
    }
  }

  const missing = REQUIRED.filter((col) => !mappedTargets.has(col));
  if (rawRows.length > 0 && missing.length > 0) {
    throw new Error('Missing columns: ' + missing.join(', '));
  }
  if (rawRows.length === 0) {
    throw new Error('Missing columns: ' + REQUIRED.join(', '));
  }

  const result = [];
  for (const row of rawRows) {
    const mapped = {};
    for (const [origKey, targetKey] of Object.entries(renameMap)) {
      mapped[targetKey] = row[origKey];
    }

    const txDate = parseDateValue(mapped.Transaction_Date);
    const amount = Number(String(mapped.Amount ?? '').replace(/,/g, '').trim());

    if (!txDate || !Number.isFinite(amount) || amount < 0) {
      continue;
    }

    result.push({
      Transaction_ID: String(mapped.Transaction_ID ?? '').trim(),
      Customer_ID: String(mapped.Customer_ID ?? '').trim(),
      Transaction_Date: txDate,
      Transaction_Type: String(mapped.Transaction_Type ?? '').trim(),
      Amount: amount,
      Location: String(mapped.Location ?? '').trim(),
      Status: String(mapped.Status ?? '').trim(),
    });
  }

  return result;
}

const FALLBACK_SAMPLE_CSV = `Transaction_ID,Customer_ID,Transaction_Date,Transaction_Type,Amount,Location,Status
T001,C101,2026-11-20,Deposit,5000,Bangalore,Success
T002,C102,2026-11-20,Withdrawal,2000,Mysore,Success
T003,C103,2026-11-21,Transfer,15000,Mumbai,Success
T004,C104,2026-11-21,Deposit,8000,Chennai,Success
T005,C105,2026-11-21,Withdrawal,3000,Delhi,Failed
T006,C101,2026-11-22,Transfer,12000,Bangalore,Success
T007,C106,2026-11-22,Deposit,25000,Hyderabad,Success
T008,C102,2026-11-22,Withdrawal,4500,Mysore,Success
T009,C107,2026-11-23,Transfer,18000,Pune,Failed
T010,C108,2026-11-23,Deposit,10000,Delhi,Success
`;

function loadFrame(upload = null) {
  if (!upload) {
    const targetPath = fs.existsSync(ACTIVE_DATA_PATH) ? ACTIVE_DATA_PATH : DATA_PATH;
    const buffer = fs.existsSync(targetPath)
      ? fs.readFileSync(targetPath)
      : Buffer.from(FALLBACK_SAMPLE_CSV, 'utf-8');
    const rawRows = parseRowsFromBuffer(fs.existsSync(targetPath) ? targetPath : 'sample.csv', buffer);
    return normalizeRecords(rawRows);
  }
  const { filename, buffer } = upload;
  const rawRows = parseRowsFromBuffer(filename, buffer);
  return normalizeRecords(rawRows);
}

function toCsvString(records) {
  const escapeCell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [
    REQUIRED.join(','),
    ...records.map((r) => REQUIRED.map((col) => escapeCell(r[col])).join(',')),
  ];
  return lines.join('\n') + '\n';
}

const app = express();

const allowedOriginsRaw =
  process.env.VAULT_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000';
const allowedOrigins = new Set(
  allowedOriginsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.has(origin) || allowedOrigins.has('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    dataset_persistent: fs.existsSync(ACTIVE_DATA_PATH),
  });
});

app.get('/api/transactions', (_req, res) => {
  try {
    const active = fs.existsSync(ACTIVE_DATA_PATH);
    const records = loadFrame();
    const source = active
      ? 'Persistent uploaded dataset'
      : 'Bundled synthetic sample dataset';
    res.json({ source, records });
  } catch (err) {
    res.status(500).json({ detail: err.message || 'Failed to load transactions' });
  }
});

app.post('/api/upload', (req, res) => {
  uploadMiddleware.single('file')(req, res, (multerErr) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ detail: 'Upload exceeds the 25 MB limit.' });
      }
      return res.status(400).json({ detail: multerErr.message });
    }
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded.' });
    }
    try {
      const records = loadFrame({
        filename: req.file.originalname,
        buffer: req.file.buffer,
      });
      fs.mkdirSync(path.dirname(ACTIVE_DATA_PATH), { recursive: true });
      const tempPath = `${ACTIVE_DATA_PATH}.tmp`;
      fs.writeFileSync(tempPath, toCsvString(records), 'utf-8');
      fs.renameSync(tempPath, ACTIVE_DATA_PATH);

      return res.json({
        source: `Uploaded: ${req.file.originalname}`,
        records,
        persisted: true,
      });
    } catch (err) {
      const msg = err.message || 'Could not process upload';
      const detail = msg.startsWith('Unsupported file type') || msg.startsWith('Missing columns')
        ? msg
        : `Could not process upload: ${msg}`;
      return res.status(400).json({ detail });
    }
  });
});

app.post('/api/reset-dataset', (_req, res) => {
  try {
    if (fs.existsSync(ACTIVE_DATA_PATH)) {
      fs.unlinkSync(ACTIVE_DATA_PATH);
    }
    const records = loadFrame();
    res.json({
      source: 'Bundled synthetic sample dataset',
      records,
      reset: true,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message || 'Failed to reset dataset' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.join(__dirname, 'vite.config.js'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VAULT server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
