-- Multi-city support. Existing areas default to 'bengaluru'; add Mumbai and
-- Delhi NCR neighbourhoods. A trainer's city is derived from its area.
ALTER TABLE areas ADD COLUMN city TEXT NOT NULL DEFAULT 'bengaluru';

INSERT OR IGNORE INTO areas (slug, name, lat, lng, city) VALUES
  ('andheri', 'Andheri', 19.1197, 72.8468, 'mumbai'),
  ('bandra', 'Bandra', 19.0596, 72.8295, 'mumbai'),
  ('powai', 'Powai', 19.1176, 72.9060, 'mumbai'),
  ('juhu', 'Juhu', 19.1075, 72.8263, 'mumbai'),
  ('dadar', 'Dadar', 19.0178, 72.8478, 'mumbai'),
  ('lower-parel', 'Lower Parel', 18.9960, 72.8302, 'mumbai'),
  ('colaba', 'Colaba', 18.9067, 72.8147, 'mumbai'),
  ('malad', 'Malad', 19.1860, 72.8484, 'mumbai'),
  ('borivali', 'Borivali', 19.2307, 72.8567, 'mumbai'),
  ('chembur', 'Chembur', 19.0620, 72.9000, 'mumbai'),
  ('goregaon', 'Goregaon', 19.1663, 72.8526, 'mumbai'),
  ('thane', 'Thane', 19.2183, 72.9781, 'mumbai'),
  ('connaught-place', 'Connaught Place', 28.6315, 77.2167, 'delhi-ncr'),
  ('saket', 'Saket', 28.5245, 77.2066, 'delhi-ncr'),
  ('dwarka', 'Dwarka', 28.5921, 77.0460, 'delhi-ncr'),
  ('rohini', 'Rohini', 28.7439, 77.0728, 'delhi-ncr'),
  ('gurugram', 'Gurugram', 28.4595, 77.0266, 'delhi-ncr'),
  ('noida', 'Noida', 28.5355, 77.3910, 'delhi-ncr'),
  ('indirapuram', 'Indirapuram', 28.6412, 77.3729, 'delhi-ncr'),
  ('vasant-kunj', 'Vasant Kunj', 28.5200, 77.1590, 'delhi-ncr'),
  ('karol-bagh', 'Karol Bagh', 28.6512, 77.1907, 'delhi-ncr'),
  ('lajpat-nagar', 'Lajpat Nagar', 28.5677, 77.2433, 'delhi-ncr'),
  ('janakpuri', 'Janakpuri', 28.6217, 77.0878, 'delhi-ncr'),
  ('greater-noida', 'Greater Noida', 28.4744, 77.5040, 'delhi-ncr');
