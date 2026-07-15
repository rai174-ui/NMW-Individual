import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = "postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway";
const client = new Client({ connectionString });

async function runImport() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");
    
    let rawSql = fs.readFileSync(path.join(process.cwd(), 'nutrimyway_supabase_import.sql'), 'utf-8');
    
    let lines = rawSql.split('\n');
    let convertedSql = [];
    let inCopyBlock = false;
    let currentTable = "";
    let currentCols = "";
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.startsWith('\\restrict') || line.startsWith('\\unrestrict') || line.startsWith('SET ') || line.startsWith('SELECT pg_catalog.set_config') || line.startsWith('CREATE SCHEMA public;')) {
         continue; // skip meta commands
      }
      if (!inCopyBlock) {
        if (line.startsWith('COPY ')) {
          inCopyBlock = true;
          // Example: COPY public.batch_consumption_logs (id, batch_id, quantity) FROM stdin;
          const match = line.match(/COPY\s+([^\s]+)\s+\(([^)]+)\)\s+FROM\s+stdin;/i);
          if (match) {
            currentTable = match[1];
            currentCols = match[2];
          }
        } else {
          convertedSql.push(line);
        }
      } else {
        if (line.trim() === '\\.') {
          inCopyBlock = false;
        } else if (line.trim() !== '') {
          // data row
          let vals = line.split('\t').map(v => {
            if (v === '\\N') return 'NULL';
            // escape quotes
            let escaped = v.replace(/'/g, "''");
            return `'${escaped}'`;
          });
          convertedSql.push(`INSERT INTO ${currentTable} (${currentCols}) VALUES (${vals.join(', ')});`);
        }
      }
    }
    
    const finalSql = convertedSql.join('\n');
    console.log(`Executing ${finalSql.length} bytes of SQL after conversion...`);
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await client.query(finalSql);
    console.log("Import completed successfully!");
  } catch (err) {
    console.error("Error during import:", err);
  } finally {
    await client.end();
  }
}

runImport();
