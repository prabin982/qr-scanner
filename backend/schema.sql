-- Run automatically on server start (safe to run many times).

CREATE TABLE IF NOT EXISTS companies (
  id                     SERIAL PRIMARY KEY,
  company_name           VARCHAR(150) NOT NULL UNIQUE,
  prefix                 VARCHAR(8)   NOT NULL UNIQUE,
  allocated_invitations  INTEGER      NOT NULL DEFAULT 0 CHECK (allocated_invitations >= 0),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invitations (
  id               SERIAL PRIMARY KEY,
  company_id       INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  seq              INTEGER      NOT NULL,
  invitation_code  VARCHAR(20)  NOT NULL UNIQUE,      -- e.g. CA-001 (printed under the QR)
  unique_token     VARCHAR(64)  NOT NULL UNIQUE,      -- random value stored inside the QR
  qr_code_data     TEXT         NOT NULL,             -- PNG data URL of the QR image
  status           VARCHAR(12)  NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'checked_in')),
  checked_in_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (company_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status  ON invitations(status);

CREATE TABLE IF NOT EXISTS scans (
  id              SERIAL PRIMARY KEY,
  invitation_id   INTEGER REFERENCES invitations(id) ON DELETE CASCADE,  -- NULL for invalid codes
  token_scanned   VARCHAR(100),
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          VARCHAR(12) NOT NULL CHECK (status IN ('success', 'duplicate', 'invalid'))
);

CREATE INDEX IF NOT EXISTS idx_scans_time ON scans(scanned_at DESC);
