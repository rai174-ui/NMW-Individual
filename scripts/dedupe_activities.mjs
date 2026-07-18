import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'
});

async function run() {
  console.log("Finding duplicated activities...");
  
  // Find all duplicated health_connect activities per member per day
  const { rows: duplicates } = await pool.query(`
    SELECT 
      member_id, 
      DATE(logged_at AT TIME ZONE 'Asia/Kolkata') as local_date, 
      COUNT(*) as count, 
      MAX(id) as keep_id 
    FROM activity_logs 
    WHERE source = 'health_connect' 
    GROUP BY member_id, local_date 
    HAVING COUNT(*) > 1
  `);

  if (duplicates.length === 0) {
    console.log("No duplicates found.");
    process.exit(0);
  }

  console.log(`Found duplicates for ${duplicates.length} member-days. Cleaning up...`);

  let deletedCount = 0;
  for (const dup of duplicates) {
    const { rowCount } = await pool.query(`
      DELETE FROM activity_logs
      WHERE member_id = $1 
        AND DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $2
        AND source = 'health_connect'
        AND id != $3
    `, [dup.member_id, dup.local_date, dup.keep_id]);
    
    deletedCount += (rowCount || 0);
  }

  console.log(`Deleted ${deletedCount} duplicate activity logs.`);
  process.exit(0);
}

run().catch(console.error);
