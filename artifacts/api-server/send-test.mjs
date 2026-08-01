import pg from "pg";
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";

// Initialize Firebase
const saPath = path.join(process.cwd(), "service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}
initializeApp({ credential: cert(serviceAccount) });

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway",
  ssl: false
});

async function run() {
  const { rows } = await pool.query(`SELECT push_token FROM members WHERE push_token IS NOT NULL AND push_token != ''`);
  const tokens = rows.map(r => r.push_token);
  
  if (tokens.length === 0) {
    console.log("No push tokens found in the database!");
    process.exit(0);
  }

  console.log(`Sending test notification to ${tokens.length} devices...`);

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { 
      title: "Firebase Success!", 
      body: "We have finally conquered the credentials ghost. Have a great day!" 
    },
    android: { priority: "high" }
  });

  console.log(`Successfully sent: ${response.successCount}`);
  console.log(`Failed to send: ${response.failureCount}`);
  if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
      if (!resp.success) console.error("Failed for token", tokens[idx], resp.error);
    });
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
