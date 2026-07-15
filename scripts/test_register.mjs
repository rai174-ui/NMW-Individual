fetch('https://nmw-individual-production.up.railway.app/api/auth/register', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({name: 'Satish Test', email: 'test_satish@example.com', password: 'password123'})
})
.then(r => {
  console.log("Status:", r.status);
  return r.text();
})
.then(console.log)
.catch(console.error);
