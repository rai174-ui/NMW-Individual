const { email, password } = { email: "john@example.com", password: "password" };
fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
}).then(r => r.json()).then(console.log).catch(console.error);
