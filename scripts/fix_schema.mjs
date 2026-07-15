import { Client } from 'pg';
const c = new Client({connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'});
c.connect()
  .then(() => c.query("ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;"))
  .then(() => console.log("Added password_hash column"))
  .then(() => c.end())
  .catch(console.error);
