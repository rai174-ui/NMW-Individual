fetch('https://nmw-individual-production.up.railway.app/api/auth/reset-password', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    otp_token: '24d26ea0b54c623fa8f5cba1c3585eca',
    otp: '921204',
    new_password: 'newpassword123'
  })
})
.then(r => {
  console.log("Status:", r.status);
  return r.text();
})
.then(console.log)
.catch(console.error);
