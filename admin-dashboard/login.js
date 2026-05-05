const API_URL = (window.location.hostname !== 'localhost') ? window.location.origin : 'http://localhost:3000';
async function login() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl  = document.getElementById('error-msg');
  errorEl.classList.remove('show');
  try {
    const res  = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error;
      errorEl.classList.add('show');
      return;
    }
    // Store admin token and info
    sessionStorage.setItem('ecrs_admin_token', data.token);
    sessionStorage.setItem('ecrs_admin',       JSON.stringify(data.admin));
    window.location.href = 'admin.html';

  } catch (err) {
    errorEl.textContent = 'Cannot connect to server.';
    errorEl.classList.add('show');
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });