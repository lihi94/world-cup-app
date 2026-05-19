-- =============================================================
-- 001_initial_schema.sql
-- Run in Supabase SQL Editor in this exact order
-- =============================================================

-- Enums
CREATE TYPE match_stage AS ENUM ('GROUP', 'R16', 'QF', 'SF', 'FINAL');
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'IN_PLAY', 'FINISHED');

-- Allowlist: only these emails can register
CREATE TABLE allowed_emails (
  email TEXT PRIMARY KEY
);

-- Teams
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  name_he     TEXT,                    -- Hebrew display name
  crest_url   TEXT,
  external_id INT  UNIQUE              -- football-data.org team ID
);

-- Players (populated by bootstrap-players Edge Function)
CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  external_id INT  UNIQUE              -- football-data.org player ID
);

-- Profiles: one row per auth.user
CREATE TABLE profiles (
  id           UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT    UNIQUE NOT NULL,
  total_points INT     NOT NULL DEFAULT 0,
  is_admin     BOOLEAN NOT NULL DEFAULT false
);

-- Matches
CREATE TABLE matches (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INT          UNIQUE,                          -- football-data.org match ID
  team_a_id   UUID         REFERENCES teams(id),
  team_b_id   UUID         REFERENCES teams(id),
  start_time  TIMESTAMPTZ  NOT NULL,
  stage       match_stage  NOT NULL,
  status      match_status NOT NULL DEFAULT 'SCHEDULED',
  score_a     INT,                                          -- 90-min ONLY (never ET)
  score_b     INT,
  winner_id   UUID         REFERENCES teams(id),            -- advancing team (may differ from 90-min winner)
  updated_at  TIMESTAMPTZ  DEFAULT now()
);

-- Predictions: one per user per match
CREATE TABLE predictions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id         UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pred_score_a     INT,
  pred_score_b     INT,
  pred_qualifier_id UUID       REFERENCES teams(id),        -- knockout matches only
  points_earned    INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- Golden Bets: one row per user (submitted before tournament)
CREATE TABLE golden_bets (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  winner_team_id UUID REFERENCES teams(id),
  top_scorer_id  UUID REFERENCES players(id),
  points_earned  INT  NOT NULL DEFAULT 0
);

-- Performance indexes
CREATE INDEX ON predictions(match_id);
CREATE INDEX ON predictions(user_id);
CREATE INDEX ON matches(status);
CREATE INDEX ON matches(start_time);
CREATE INDEX ON players(team_id);
