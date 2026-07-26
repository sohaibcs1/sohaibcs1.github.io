CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,
  day_key TEXT NOT NULL,
  country_code TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  pageviews INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  path TEXT,
  UNIQUE(visitor_hash, day_key)
);

CREATE INDEX IF NOT EXISTS idx_visits_last_seen ON visits(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_visits_location ON visits(country_code, city);

