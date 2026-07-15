const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway";
const client = new Client({ connectionString });

async function runImport() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");
    const sql = fs.readFileSync(path.join(process.cwd(), 'nutrimyway_supabase_import.sql'), 'utf-8');
    console.log(`Executing ${sql.length} bytes of SQL...`);
    await client.query(sql);
    console.log("Import completed successfully!");
  } catch (err) {
    console.error("Error during import:", err);
  } finally {
    await client.end();
  }
}

runImport();
