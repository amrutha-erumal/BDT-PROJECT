import * as XLSX from 'xlsx';

const STORAGE_KEY = 'vault_active_dataset_v1';
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const REQUIRED = [
  'Transaction_ID',
  'Customer_ID',
  'Transaction_Date',
  'Transaction_Type',
  'Amount',
  'Location',
  'Status',
];

export const BUNDLED_SAMPLE_RECORDS = [
  { Transaction_ID: 'T001', Customer_ID: 'C101', Transaction_Date: '2026-11-20', Transaction_Type: 'Deposit', Amount: 5000, Location: 'Bangalore', Status: 'Success' },
  { Transaction_ID: 'T002', Customer_ID: 'C102', Transaction_Date: '2026-11-20', Transaction_Type: 'Withdrawal', Amount: 2000, Location: 'Mysore', Status: 'Success' },
  { Transaction_ID: 'T003', Customer_ID: 'C103', Transaction_Date: '2026-11-21', Transaction_Type: 'Transfer', Amount: 15000, Location: 'Mumbai', Status: 'Success' },
  { Transaction_ID: 'T004', Customer_ID: 'C104', Transaction_Date: '2026-11-21', Transaction_Type: 'Deposit', Amount: 8000, Location: 'Chennai', Status: 'Success' },
  { Transaction_ID: 'T005', Customer_ID: 'C105', Transaction_Date: '2026-11-21', Transaction_Type: 'Withdrawal', Amount: 3000, Location: 'Delhi', Status: 'Failed' },
  { Transaction_ID: 'T006', Customer_ID: 'C101', Transaction_Date: '2026-11-22', Transaction_Type: 'Transfer', Amount: 12000, Location: 'Bangalore', Status: 'Success' },
  { Transaction_ID: 'T007', Customer_ID: 'C106', Transaction_Date: '2026-11-22', Transaction_Type: 'Deposit', Amount: 25000, Location: 'Hyderabad', Status: 'Success' },
  { Transaction_ID: 'T008', Customer_ID: 'C102', Transaction_Date: '2026-11-22', Transaction_Type: 'Withdrawal', Amount: 4500, Location: 'Mysore', Status: 'Success' },
  { Transaction_ID: 'T009', Customer_ID: 'C107', Transaction_Date: '2026-11-23', Transaction_Type: 'Transfer', Amount: 18000, Location: 'Pune', Status: 'Failed' },
  { Transaction_ID: 'T010', Customer_ID: 'C108', Transaction_Date: '2026-11-23', Transaction_Type: 'Deposit', Amount: 10000, Location: 'Delhi', Status: 'Success' },
];

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

function normalizeRows(rawRows) {
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
  if (missing.length > 0) {
    throw new Error('Missing columns: ' + missing.join(', '));
  }

  const result = [];
  for (const row of rawRows) {
    const mapped = {};
    for (const [origKey, targetKey] of Object.entries(renameMap)) {
      mapped[targetKey] = row[origKey];
    }
    const txDate = parseDateValue(mapped.Transaction_Date);
    const amount = Number(String(mapped.Amount ?? '').replace(/,/g, '').trim());
    if (!txDate || !Number.isFinite(amount) || amount < 0) continue;

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

export function loadLocalDataset() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.records) && parsed.records.length > 0) {
        return {
          source: parsed.source || 'Persistent uploaded dataset',
          records: parsed.records,
        };
      }
    }
  } catch {
    // Ignore storage read errors and fall back to bundled sample
  }
  return {
    source: 'Bundled synthetic sample dataset',
    records: BUNDLED_SAMPLE_RECORDS,
  };
}

export async function parseAndStoreLocalUpload(file) {
  const name = file?.name || '';
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Unsupported file type. Upload CSV or Excel (.xlsx/.xls).');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Upload exceeds the 25 MB limit.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error('Uploaded file contains no data.');
  }
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    raw: true,
    defval: '',
  });
  const records = normalizeRows(rawRows);
  const payload = {
    source: `Uploaded: ${name}`,
    records,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota errors; state still updates in memory
  }
  return payload;
}

export function resetLocalDataset() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  return {
    source: 'Bundled synthetic sample dataset',
    records: BUNDLED_SAMPLE_RECORDS,
  };
}
