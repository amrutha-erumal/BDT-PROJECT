# VAULT — Banking Transaction Intelligence

A premium, multi-view banking transaction analytics workspace built with React, Vite, Three.js / React Three Fiber, Framer Motion, Recharts, FastAPI and Pandas.

## Run on Ubuntu / WSL

Extract this ZIP, open a terminal in the extracted folder, then use two Ubuntu terminals.

### Terminal 1 — API

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Web application

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Included views

- **Overview:** immersive 3D transaction environment, dataset KPIs, daily value movement, outcomes, transaction mix, location totals and recent records.
- **Transaction Flow:** interactive location network derived from the loaded records.
- **Analytics:** daily value/volume and transaction-type comparisons.
- **Geographic Intelligence:** stylized location activity field and ranking. Pins are illustrative placements, not GPS coordinates.
- **Risk & Failures:** review queue for records whose source status is `Failed`.
- **Data Explorer:** search, filter, inspect individual records and export the current view.
- **Reports:** export summary and source-field overview.
- **AI Insights:** descriptive calculations from the current records; not predictive AI.

## Data handling

The bundled `data/banking_transactions.csv` is the original synthetic 10-record sample. The dashboard calculates displayed totals and charts from the records returned by the API. CSV and Excel uploads replace the active dataset and persist to `data/active_transactions.csv`, surviving refreshes and backend restarts. Use the **Restore sample** button in the dashboard to return to the bundled sample. Uploads are capped at 25 MB and are validated before replacing the active dataset.

Required columns:

`Transaction_ID, Customer_ID, Transaction_Date, Transaction_Type, Amount, Location, Status`

## Big Data project scope — important

This application currently reads CSV/Excel files through FastAPI and Pandas. Uploaded datasets are stored locally as a normalized CSV file; this is file persistence, not a database. It is **not directly connected to HDFS, Hadoop MapReduce or Apache Hive**. Those technologies remain separate project components until a real integration pipeline is implemented. The bundled data is synthetic, and this is an academic analytics demonstration—not a live banking system, real-time payment network, fraud detector or source of verified fraud findings.

## Notes

- `npm install` requires internet access the first time.
- Keep both terminal windows running while using VAULT.
- The API is available at `http://localhost:8000`; its health endpoint is `/api/health`.
