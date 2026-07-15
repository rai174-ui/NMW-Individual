import { Client } from 'pg';
const c = new Client({connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'});
c.connect()
  .then(() => c.query("SELECT id, name, email FROM members"))
  .then(res => console.table(res.rows))
  .then(() => c.end())
  .catch(console.error);
