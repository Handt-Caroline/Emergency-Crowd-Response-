const API_URL = (window.location.hostname !== 'localhost') ? window.location.origin : 'http://localhost:3000';
let adminToken  = null;
let allHospitals = [];

// ── On load ────────────────────────────────────────────────────────────
window.onload = () => {
  adminToken = sessionStorage.getItem('ecrs_admin_token');
  const admin = JSON.parse(sessionStorage.getItem('ecrs_admin') || 'null');
  if (!adminToken) { window.location.href = 'index.html'; return; }
  document.getElementById('admin-name').textContent =
    admin ? `Welcome, ${admin.name}` : 'Admin Panel';
  loadStats();
  loadHospitals();
};

// ── Tab switching ───────────────────────────────────────────────────────
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  btn.classList.add('active');
  if (tab === 'alerts') loadAlerts();
}

// ── Stats ──────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    document.getElementById('stat-approved').textContent  = data.approvedHospitals  ?? 0;
    document.getElementById('stat-pending').textContent   = data.pendingHospitals   ?? 0;
    document.getElementById('stat-suspended').textContent = data.suspendedHospitals ?? 0;
    document.getElementById('stat-alerts').textContent    = data.alertsToday        ?? 0;
  } catch (err) { console.error('Stats error:', err); }
}

// ── Hospitals ──────────────────────────────────────────────────────────
async function loadHospitals() {
  try {
    const res  = await fetch(`${API_URL}/api/admin/institutions`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    allHospitals = data.institutions || [];
    renderTable(allHospitals);
  } catch (err) { console.error('Load hospitals error:', err); }
}

function renderTable(hospitals) {
  const tbody = document.getElementById('hosp-tbody');
  if (!hospitals.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hospitals found</td></tr>';
    return;
  }
  tbody.innerHTML = hospitals.map(h => {
    const badge = h.status === 'approved'
      ? '<span class="badge badge-approved">APPROVED</span>'
      : h.status === 'pending'
      ? '<span class="badge badge-pending">PENDING</span>'
      : '<span class="badge badge-suspended">SUSPENDED</span>';
    const date       = new Date(h.created_at).toLocaleDateString('fr-FR');
    const approveBtn = h.status !== 'approved'
      ? `<button class='btn-approve' onclick='approveHospital(${h.id})'>Approve</button>` : '';
    const suspendBtn = h.status === 'approved'
      ? `<button class='btn-suspend' onclick='suspendHospital(${h.id})'>Suspend</button>` : '';
    return `
      <tr data-status='${h.status}'>
        <td><div class='hosp-name'>${h.name}</div><div class='hosp-email'>${h.email}</div></td>
        <td style='font-size:13px;color:var(--muted)'>${h.phone || '—'}</td>
        <td>${badge}</td>
        <td style='font-size:13px;color:var(--muted)'>${date}</td>
        <td><div class='action-btns'>${approveBtn}${suspendBtn}</div></td>
      </tr>
    `;
  }).join('');
}

function filterTable(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? allHospitals : allHospitals.filter(h => h.status === status);
  renderTable(filtered);
}

async function approveHospital(id) {
  try {
    const res = await fetch(`${API_URL}/api/admin/institutions/${id}/approve`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      allHospitals = allHospitals.map(h => h.id === id ? {...h, status:'approved'} : h);
      renderTable(allHospitals);
      loadStats();
    }
  } catch (err) { console.error('Approve error:', err); }
}

async function suspendHospital(id) {
  if (!confirm('Suspend this hospital? They will be immediately disconnected from the alert network.')) return;
  try {
    const res = await fetch(`${API_URL}/api/admin/institutions/${id}/suspend`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      allHospitals = allHospitals.map(h => h.id === id ? {...h, status:'suspended'} : h);
      renderTable(allHospitals);
      loadStats();
    }
  } catch (err) { console.error('Suspend error:', err); }
}

// ── Alert History ──────────────────────────────────────────────────────
async function loadAlerts() {
  const tbody = document.getElementById('alerts-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading...</td></tr>';
  try {
    const res  = await fetch(`${API_URL}/api/admin/alerts`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    renderAlerts(data.alerts || []);
  } catch (err) {
    console.error('Load alerts error:', err);
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load alerts</td></tr>';
  }
}

function renderAlerts(alerts) {
  const tbody = document.getElementById('alerts-tbody');
  if (!alerts.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No alerts yet</td></tr>';
    return;
  }

  tbody.innerHTML = alerts.map(a => {
    // Status badge
    const statusClass = {
      CONFIRMED:  'as-confirmed',
      DISPATCHED: 'as-dispatched',
      FAILED:     'as-failed',
      RESOLVED:   'as-resolved',
    }[a.status] || 'as-dispatched';

    const statusBadge = `<span class="alert-status ${statusClass}">${a.status}</span>`;

    // Confirmed by
    const confirmedCell = a.confirmed_by
      ? `<span class="by-name">✅ ${a.confirmed_by}</span>`
      : `<span class="by-none">—</span>`;

    // Declined by (may be comma-separated list)
    const declinedCell = a.declined_by
      ? `<span class="declined-list">❌ ${a.declined_by}</span>`
      : `<span class="by-none">—</span>`;

    // Victims
    const victimsCell = a.victims_count
      ? `<span class="victims-badge">${a.victims_count}</span>`
      : '<span class="by-none">—</span>';

    // Time
    const time = new Date(a.created_at).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    // Situation — clean it up a bit
    const situation = (a.situation || '—').replace(/_/g, ' ');

    return `
      <tr>
        <td style="font-size:12px;color:var(--muted);font-weight:600">#${a.id}</td>
        <td>
          <div style="font-size:12px;font-weight:700;color:var(--text)">${a.emergency_type}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${situation}</div>
        </td>
        <td>${victimsCell}</td>
        <td>${statusBadge}</td>
        <td>${confirmedCell}</td>
        <td>${declinedCell}</td>
        <td style="font-size:11px;color:var(--muted);white-space:nowrap">${time}</td>
      </tr>
    `;
  }).join('');
}

// ── Logout ─────────────────────────────────────────────────────────────
function logout() {
  sessionStorage.removeItem('ecrs_admin_token');
  sessionStorage.removeItem('ecrs_admin');
  window.location.href = 'index.html';
}