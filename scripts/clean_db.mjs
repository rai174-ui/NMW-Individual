import { Client } from 'pg';
const c = new Client({connectionString: 'postgresql://postgres:QwqlGzmRapxIQnAXpSVwNEmShxSYrAmI@autorack.proxy.rlwy.net:43443/railway'});

const unwanted = [
  'super_admin_auth',
  'pack_sizes',
  'super_admin_reset_tokens',
  'bom_items',
  'ingredient_batches',
  'batch_adjustments',
  'batch_consumption_logs',
  'centers',
  'center_auth',
  'center_broadcast_schedules',
  'center_broadcast_settings',
  'center_flavours',
  'member_check_ins',
  'menu_items',
  'ingredients',
  'issuances',
  'member_broadcasts',
  'member_broadcast_reads',
  'member_center_mapping',
  'menu_item_bom',
  'user_auth',
  'visit_flavour_selections',
  'visit_menu_selections'
];

c.connect()
  .then(async () => {
    for (const table of unwanted) {
      await c.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
      console.log(`Dropped ${table}`);
    }
  })
  .then(() => console.log("Database cleaned successfully."))
  .then(() => c.end())
  .catch(console.error);
