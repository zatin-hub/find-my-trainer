-- Reference data only: the activity taxonomy and Bengaluru areas. The
-- illustrative sample trainers in data/seed.ts are intentionally NOT seeded in
-- production — real trainers come from user submissions.

INSERT OR IGNORE INTO activities (slug, name, icon) VALUES
  ('gym-personal-training', 'Gym / Personal Training', '🏋️'),
  ('yoga', 'Yoga', '🧘'),
  ('zumba-dance', 'Zumba / Dance Fitness', '💃'),
  ('swimming', 'Swimming', '🏊'),
  ('boxing-mma', 'Boxing / MMA', '🥊'),
  ('badminton', 'Badminton', '🏸'),
  ('tennis', 'Tennis', '🎾'),
  ('running-marathon', 'Running / Marathon', '🏃'),
  ('calisthenics', 'Calisthenics', '🤸'),
  ('pilates', 'Pilates', '🧗'),
  ('crossfit', 'CrossFit', '🔥'),
  ('strength-conditioning', 'Strength & Conditioning', '💪'),
  ('kids-fitness', 'Kids Fitness', '🧒');

INSERT OR IGNORE INTO areas (slug, name, lat, lng) VALUES
  ('indiranagar', 'Indiranagar', 12.9719, 77.6412),
  ('koramangala', 'Koramangala', 12.9352, 77.6245),
  ('hsr-layout', 'HSR Layout', 12.9081, 77.6476),
  ('whitefield', 'Whitefield', 12.9698, 77.75),
  ('jayanagar', 'Jayanagar', 12.925, 77.5938),
  ('jp-nagar', 'JP Nagar', 12.9063, 77.5857),
  ('marathahalli', 'Marathahalli', 12.9591, 77.6974),
  ('bellandur', 'Bellandur', 12.9304, 77.6784),
  ('btm-layout', 'BTM Layout', 12.9166, 77.6101),
  ('electronic-city', 'Electronic City', 12.8452, 77.6602),
  ('malleshwaram', 'Malleshwaram', 13.0035, 77.5647),
  ('rajajinagar', 'Rajajinagar', 12.9982, 77.555),
  ('banashankari', 'Banashankari', 12.9255, 77.5468),
  ('yelahanka', 'Yelahanka', 13.1007, 77.5963),
  ('hebbal', 'Hebbal', 13.0358, 77.597),
  ('sarjapur-road', 'Sarjapur Road', 12.901, 77.687),
  ('mg-road', 'MG Road', 12.9756, 77.6068),
  ('basavanagudi', 'Basavanagudi', 12.942, 77.573),
  ('kalyan-nagar', 'Kalyan Nagar', 13.0254, 77.6408),
  ('rt-nagar', 'RT Nagar', 13.0207, 77.5945);
