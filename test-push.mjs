import pg from "pg";
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";

const { Pool } = pg;

async function run() {
  console.log("Connecting to production DB...");
  const pool = new Pool({
    connectionString: "postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway",
    ssl: { rejectUnauthorized: false }
  });

  const { rows } = await pool.query("SELECT push_token FROM members WHERE push_token IS NOT NULL");
  const tokens = rows.map(r => r.push_token);

  if (tokens.length === 0) {
    console.log("No push tokens found in production DB. Cannot send test push.");
    process.exit(1);
  }

  console.log(`Found ${tokens.length} tokens. Initializing Firebase...`);
  const serviceAccount = JSON.parse(fs.readFileSync("artifacts/api-server/service-account.json", "utf8"));
  initializeApp({ credential: cert(serviceAccount) });

  const messaging = getMessaging();
  console.log("Sending test push...");
  
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: "Test Notification",
      body: "This test for notification! HealthLogix AI Tips are working."
    },
    android: {
      priority: "high",
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
  });

  console.log(`Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
  if (response.failureCount > 0) {
    response.responses.forEach((r, idx) => {
      if (!r.success) console.error("Error for token:", tokens[idx], r.error);
    });
  }
  
  process.exit(0);
}

run().catch(console.error);
