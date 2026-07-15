import { Client } from 'pg';
const c = new Client({connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'});
c.connect()
  .then(() => c.query("SELECT * FROM otps WHERE otp_token = '24d26ea0b54c623fa8f5cba1c3585eca'"))
  .then(res => console.table(res.rows))
  .then(() => c.end())
  .catch(console.error);
