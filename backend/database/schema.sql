-- ============================================================
-- LIV Smart Irrigation Platform - Supabase Database Schema
-- ============================================================
-- This schema is for reference when migrating to a real Supabase
-- instance. The dev server uses in-memory data stores.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- Users / Profiles
-- --------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         TEXT UNIQUE NOT NULL,
  name          TEXT,
  email         TEXT,
  role          TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role  ON profiles(role);

-- --------------------------------------------------------
-- Gateways
-- --------------------------------------------------------
CREATE TABLE gateways (
  id            TEXT PRIMARY KEY,                     -- e.g. 'LIVGW001'
  name          TEXT NOT NULL,
  secret        TEXT NOT NULL,                        -- claim secret
  farmer_id     UUID REFERENCES profiles(id),         -- NULL = unclaimed
  status        TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  pump_status   BOOLEAN NOT NULL DEFAULT false,
  water_level   REAL NOT NULL DEFAULT 0,
  battery       REAL NOT NULL DEFAULT 100,
  firmware      TEXT DEFAULT '1.0.0',
  location      JSONB,                                -- { lat, lng, address }
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateways_farmer ON gateways(farmer_id);
CREATE INDEX idx_gateways_status ON gateways(status);

-- --------------------------------------------------------
-- Field Nodes
-- --------------------------------------------------------
CREATE TABLE nodes (
  id            TEXT PRIMARY KEY,                     -- e.g. 'LIV001'
  gateway_id    TEXT NOT NULL REFERENCES gateways(id),
  crop_name     TEXT DEFAULT 'Unknown Crop',
  soil_moisture REAL DEFAULT 0,
  temperature   REAL DEFAULT 0,
  humidity      REAL DEFAULT 0,
  valve_status  BOOLEAN NOT NULL DEFAULT false,
  battery       REAL NOT NULL DEFAULT 100,
  status        TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nodes_gateway ON nodes(gateway_id);
CREATE INDEX idx_nodes_status  ON nodes(status);

-- --------------------------------------------------------
-- Sensor Telemetry History
-- --------------------------------------------------------
CREATE TABLE sensor_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id       TEXT NOT NULL REFERENCES nodes(id),
  soil_moisture REAL,
  temperature   REAL,
  humidity      REAL,
  valve_status  BOOLEAN,
  battery       REAL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sensor_history_node ON sensor_history(node_id);
CREATE INDEX idx_sensor_history_time ON sensor_history(recorded_at DESC);

-- --------------------------------------------------------
-- Gateway Telemetry History
-- --------------------------------------------------------
CREATE TABLE gateway_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_id    TEXT NOT NULL REFERENCES gateways(id),
  pump_status   BOOLEAN,
  water_level   REAL,
  battery       REAL,
  status        TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateway_history_gw   ON gateway_history(gateway_id);
CREATE INDEX idx_gateway_history_time ON gateway_history(recorded_at DESC);

-- --------------------------------------------------------
-- Commands
-- --------------------------------------------------------
CREATE TABLE commands (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_id    TEXT NOT NULL REFERENCES gateways(id),
  node_id       TEXT REFERENCES nodes(id),
  command       TEXT NOT NULL,                        -- e.g. 'PUMP_ON', 'VALVE_OPEN'
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'failed')),
  issued_by     UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_commands_gateway ON commands(gateway_id);
CREATE INDEX idx_commands_status  ON commands(status);

-- --------------------------------------------------------
-- Activity Log
-- --------------------------------------------------------
CREATE TABLE activity_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          TEXT NOT NULL,                        -- 'pump', 'valve', 'connectivity', 'alert', 'claim'
  gateway_id    TEXT REFERENCES gateways(id),
  node_id       TEXT REFERENCES nodes(id),
  farmer_id     UUID REFERENCES profiles(id),
  message       TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_type ON activity_log(type);
CREATE INDEX idx_activity_time ON activity_log(created_at DESC);

-- --------------------------------------------------------
-- Alerts
-- --------------------------------------------------------
CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          TEXT NOT NULL,                        -- 'low_battery', 'low_moisture', 'offline', 'low_water'
  severity      TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  gateway_id    TEXT REFERENCES gateways(id),
  node_id       TEXT REFERENCES nodes(id),
  farmer_id     UUID REFERENCES profiles(id),
  message       TEXT NOT NULL,
  resolved      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_time     ON alerts(created_at DESC);

-- --------------------------------------------------------
-- Row Level Security (RLS) Policies
-- --------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

-- Farmers can only see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Farmers can only see their own gateways
CREATE POLICY "Farmers can view own gateways"
  ON gateways FOR SELECT
  USING (farmer_id = auth.uid());

-- Farmers can see nodes belonging to their gateways
CREATE POLICY "Farmers can view own nodes"
  ON nodes FOR SELECT
  USING (gateway_id IN (
    SELECT id FROM gateways WHERE farmer_id = auth.uid()
  ));

-- Admins bypass RLS via service role key
