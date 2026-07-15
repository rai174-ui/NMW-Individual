import { Client } from 'pg';
const c = new Client({connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'});
c.connect()
  .then(() => c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
  .then(res => console.table(res.rows.map(r => r.table_name)))
  .then(() => c.end())
  .catch(console.error);
