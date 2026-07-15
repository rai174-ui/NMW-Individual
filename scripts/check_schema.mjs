import { Client } from 'pg';
const c = new Client({connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'});
c.connect()
  .then(() => c.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'members'"))
  .then(res => console.table(res.rows))
  .then(() => c.end())
  .catch(console.error);
