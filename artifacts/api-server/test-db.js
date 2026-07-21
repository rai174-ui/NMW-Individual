const { Pool } = require("pg");
const pool = new Pool({
  connectionString: "postgres://postgres@localhost:54321/nutrimyway"
});
pool.query("SELECT id, email, is_active FROM members LIMIT 10")
  .then(res => {
    console.log("Members:", res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
