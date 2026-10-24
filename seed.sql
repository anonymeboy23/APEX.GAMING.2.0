-- Données initiales Apex Gaming
INSERT OR IGNORE INTO products (id, name, description, active) VALUES
  ('psn', 'PlayStation', 'Cartes PSN par pays et région', 1),
  ('spotify', 'Spotify', 'Premium et musique', 1),
  ('apple', 'Apple Music', 'Apple Music, App Store et iTunes', 1),
  ('netflix', 'Netflix', 'Films et séries', 1),
  ('xbox', 'Xbox', 'Jeux et Game Pass', 1),
  ('steam', 'Steam', 'Jeux PC', 1),
  ('google', 'Google Play', 'Applications et jeux Android', 1);

INSERT OR IGNORE INTO inventory (product_id, quantity)
SELECT id, 0 FROM products;

-- Les promotions restent désactivées tant qu'elles ne sont pas configurées.
INSERT OR IGNORE INTO promotions (code, percent, active) VALUES ('APEX10', 10, 0);
