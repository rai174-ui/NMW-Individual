import { Client } from 'pg';
const c = new Client({connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'});
c.connect()
  .then(() => c.query(`
    ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS target_protein_g INTEGER,
    ADD COLUMN IF NOT EXISTS target_fiber_g INTEGER,
    ADD COLUMN IF NOT EXISTS target_water_ml INTEGER;
    
    CREATE TABLE IF NOT EXISTS water_logs (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      amount_ml INTEGER NOT NULL,
      logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `))
  .then(() => { console.log('Migrations applied'); c.end(); })
  .catch(console.error);
