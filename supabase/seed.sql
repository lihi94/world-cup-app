-- =============================================================
-- seed.sql
-- Run AFTER all 3 migrations have been applied.
-- =============================================================

-- ── 1. Allowed emails — replace with your 18 friends' addresses ──
INSERT INTO allowed_emails (email) VALUES
  ('friend01@example.com'),
  ('friend02@example.com'),
  ('friend03@example.com'),
  ('friend04@example.com'),
  ('friend05@example.com'),
  ('friend06@example.com'),
  ('friend07@example.com'),
  ('friend08@example.com'),
  ('friend09@example.com'),
  ('friend10@example.com'),
  ('friend11@example.com'),
  ('friend12@example.com'),
  ('friend13@example.com'),
  ('friend14@example.com'),
  ('friend15@example.com'),
  ('friend16@example.com'),
  ('friend17@example.com'),
  ('friend18@example.com')
ON CONFLICT DO NOTHING;

-- ── 2. FIFA World Cup 2026 Teams (football-data.org external IDs) ──
-- external_id values from football-data.org — verify at:
-- GET https://api.football-data.org/v4/competitions/WC/teams?season=2026
-- Placeholder data — update external_id once tournament draw is confirmed.
INSERT INTO teams (name, name_he, external_id) VALUES
  ('Argentina',      'ארגנטינה',     762),
  ('Brazil',         'ברזיל',         764),
  ('France',         'צרפת',          773),
  ('Germany',        'גרמניה',        759),
  ('Spain',          'ספרד',          760),
  ('England',        'אנגליה',        770),
  ('Portugal',       'פורטוגל',       765),
  ('Netherlands',    'הולנד',         786),
  ('Italy',          'איטליה',        784),
  ('Belgium',        'בלגיה',         805),
  ('Croatia',        'קרואטיה',       799),
  ('Morocco',        'מרוקו',         1068),
  ('Senegal',        'סנגל',          907),
  ('Japan',          'יפן',           827),
  ('South Korea',    'קוריאה הדרומית', 796),
  ('United States',  'ארה"ב',         768),
  ('Mexico',         'מקסיקו',        811),
  ('Canada',         'קנדה',          784),
  ('Australia',      'אוסטרליה',      793),
  ('Uruguay',        'אורוגוואי',     803),
  ('Colombia',       'קולומביה',      801),
  ('Ecuador',        'אקוואדור',      855),
  ('Chile',          'צ''ילה',        812),
  ('Peru',           'פרו',           815),
  ('Switzerland',    'שווייץ',        788),
  ('Poland',         'פולין',         794),
  ('Serbia',         'סרביה',         799),
  ('Denmark',        'דנמרק',         782),
  ('Austria',        'אוסטריה',       816),
  ('Cameroon',       'קמרון',         1063),
  ('Ghana',          'גאנה',          1062),
  ('Nigeria',        'ניגריה',        1065)
ON CONFLICT (external_id) DO NOTHING;

-- ── 3. Grant admin to first user (run after you register) ──
-- Replace YOUR_EMAIL with the admin account email:
-- UPDATE profiles SET is_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');
