const API_URL = (window.location.hostname !== 'localhost') ? window.location.origin : 'http://localhost:3000';
async function login() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl  = document.getElementById('error-msg');
  errorEl.classList.remove('show');
  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password.';
    errorEl.classList.add('show');
    return;
  }
  try {
    const res  = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      // Show the error from backend (bilingual)
      errorEl.textContent = data.error_fr || data.error;
      errorEl.classList.add('show');
      return;
    }
    // Store token and hospital info in sessionStorage
    sessionStorage.setItem('ecrs_token', data.token);
    sessionStorage.setItem('ecrs_hospital', JSON.stringify(data.institution));
    // Redirect to main dashboard
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorEl.textContent = 'Cannot connect to server. Is it running?';
    errorEl.classList.add('show');
  }
}
// Allow Enter key to submit
document.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });