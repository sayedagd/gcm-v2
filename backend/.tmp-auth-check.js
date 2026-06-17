const { Client } = require('pg');

(async () => {
  const connectionString = process.argv[2];
  const email = process.argv[3];
  const client = new Client({ connectionString });
  await client.connect();
  const sql = 'SELECT id, email, role, password, length(password) AS password_len FROM users WHERE lower(email)=lower($1) LIMIT 1';
  const q = await client.query(sql, [email]);
  console.log(JSON.stringify(q.rows[0] || null));
  await client.end();
})().catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
