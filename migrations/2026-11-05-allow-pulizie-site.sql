PRAGMA foreign_keys = OFF;
CREATE TABLE lead_records_new (
  id TEXT PRIMARY KEY,
  site TEXT NOT NULL CHECK (site IN ('tettochiaro','tettocondominio','puliziecondominialiverona')),
  event_type TEXT NOT NULL CHECK (event_type IN ('calculation','lead','email_capture')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  lead_score INTEGER,
  privacy_accepted INTEGER NOT NULL DEFAULT 0,
  partner_accepted INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL
);
INSERT INTO lead_records_new SELECT * FROM lead_records;
DROP TABLE lead_records;
ALTER TABLE lead_records_new RENAME TO lead_records;
CREATE INDEX IF NOT EXISTS idx_lead_records_created ON lead_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_records_email ON lead_records(email);
PRAGMA foreign_keys = ON;
