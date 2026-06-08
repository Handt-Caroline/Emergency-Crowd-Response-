
// ── Config — change this to your machine's IP when demoing on phone ──
// Find your IP: run  ipconfig (Windows)  or  ifconfig (Mac/Linux)
// Example: const API_URL = 'http://192.168.1.45:3000';
// API_URL auto-detects: works on localhost AND on your deployed server
const API_URL = (window.location.hostname !== 'localhost')
  ? window.location.origin
  : 'http://localhost:3000';

// ── All equipment options (must match categoryMapper.js) ─────────────
const EQUIPMENT_OPTIONS = [
  { val: 'DEFIBRILLATOR',   label: '🫀 Defibrillator'     },
  { val: 'OXYGEN',          label: '💨 Oxygen'             },
  { val: 'VENTILATOR',      label: '🌬️ Ventilator'        },
  { val: 'ICU_BEDS',        label: '🛏️ ICU Beds'          },
  { val: 'ECG_MACHINE',     label: '📈 ECG Machine'        },
  { val: 'XRAY',            label: '🔬 X-Ray'              },
  { val: 'CT_SCAN',         label: '🖥️ CT Scan'           },
  { val: 'BLOOD_BANK',      label: '🩸 Blood Bank'         },
  { val: 'OPERATING_THEATRE',label: '🏥 Operating Theatre' },
  { val: 'EMERGENCY_BAY',   label: '🚨 Emergency Bay'      },
  { val: 'MATERNITY',       label: '🤱 Maternity'          },
  { val: 'MATERNITY_WARD',  label: '🏩 Maternity Ward'     },
  { val: 'TRAUMA_SURGERY',  label: '🩹 Trauma Surgery'     },
  { val: 'PAEDIATRIC_WARD', label: '👶 Paediatric Ward'    },
];

// ── All personnel options ─────────────────────────────────────────────
const PERSONNEL_OPTIONS = [
  { val: 'GENERAL_DOCTOR',      label: '👨‍⚕️ General Doctor'      },
  { val: 'ANAESTHESIOLOGIST',   label: '💉 Anaesthesiologist'   },
  { val: 'CARDIOLOGIST',        label: '🫀 Cardiologist'         },
  { val: 'SURGEON',             label: '🔪 Surgeon'              },
  { val: 'NEUROLOGIST',         label: '🧠 Neurologist'          },
  { val: 'OBSTETRICIAN',        label: '🤰 Obstetrician'         },
  { val: 'MIDWIFE',             label: '👩‍⚕️ Midwife'            },
  { val: 'PAEDIATRICIAN',       label: '👶 Paediatrician'        },
  { val: 'RESUSCITATION_NURSE', label: '🏥 Resuscitation Nurse'  },
];

// ── State ──────────────────────────────────────────────────────────────
let token        = null;
let hospital     = null;
let socket       = null;
let currentAlert = null;
let map          = null;
let alertMarker  = null;

// ── Boot ───────────────────────────────────────────────────────────────
window.onload = () => {
  token    = sessionStorage.getItem('ecrs_token');
  hospital = JSON.parse(sessionStorage.getItem('ecrs_hospital') || 'null');

  if (!token || !hospital) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('hosp-name').textContent = hospital.name;

  if (hospital.free_capacity !== undefined) {
    document.getElementById('beds-input').value = hospital.free_capacity;
  }
  // Show account status (approved / suspended / pending) — hospitals don't toggle availability
  updateStatusBadge(hospital.status || 'approved');

  buildProfileForm();
  connectSocket();
  loadCaseHistory();
};

// ── Tab switcher ───────────────────────────────────────────────────────
function switchTab(tab) {
  ['status', 'profile', 'history'].forEach(t => {
    document.getElementById(`tab-${t}`).style.display     = 'none';
    document.getElementById(`tab-btn-${t}`).classList.remove('active');
  });
  document.getElementById(`tab-${tab}`).style.display    = 'block';
  document.getElementById(`tab-btn-${tab}`).classList.add('active');

  if (tab === 'history') loadCaseHistory();
  if (tab === 'profile') fillProfileForm();
}

// ── Logout ─────────────────────────────────────────────────────────────
function logout() {
  if (!confirm('Log out of the ECRS dashboard?')) return;
  if (socket) socket.disconnect();
  sessionStorage.removeItem('ecrs_token');
  sessionStorage.removeItem('ecrs_hospital');
  window.location.href = 'index.html';
}

// ── Socket connection ──────────────────────────────────────────────────
function connectSocket() {
  socket = io(API_URL, { auth: { token } });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket.id);
    socket.emit('join_room', hospital.id);
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Disconnected');
  });

  socket.on('emergency:new', (data) => {
    receiveAlert(data);
  });

  socket.on('account:suspended', (data) => {
    showSuspendedScreen(data.message || 'Your account has been suspended.');
  });
}

// ── Receive and display incoming alert ────────────────────────────────
function receiveAlert(data) {
  currentAlert = data;

  document.getElementById('standby').style.display = 'none';
  document.getElementById('alert-panel').classList.add('active');

  playAlarmSound();

  document.getElementById('a-type').textContent = data.emergency_type || '—';
  document.getElementById('a-sit').textContent  = (data.situation || '—').replace(/_/g, ' ');
  document.getElementById('a-vic').textContent  = data.victims_count  || '—';
  document.getElementById('a-dist').textContent =
    data.distance_metres ? `${Math.round(data.distance_metres / 100) / 10} km` : '—';

  const contactEl = document.getElementById('a-contact');
  if (data.bystander_name || data.bystander_phone) {
    contactEl.innerHTML =
      `${data.bystander_name || 'Anonymous'}` +
      (data.bystander_phone
        ? ` — <a href="tel:${data.bystander_phone}" style="color:#4fc3f7">${data.bystander_phone}</a>`
        : '');
  } else {
    contactEl.textContent = 'Anonymous / Anonyme';
  }

  // Photo — use the dedicated slot in the HTML
  const photoRow = document.getElementById('photo-row');
  const photoImg  = document.getElementById('alert-photo');
  if (data.photo_url) {
    photoImg.src = data.photo_url.startsWith('http')
      ? data.photo_url
      : `${API_URL}${data.photo_url}`;
    photoRow.style.display = 'flex';
  } else {
    photoRow.style.display = 'none';
    photoImg.src = '';
  }

  // Preparation checklist
  const prepEl    = document.getElementById('prep-list');
  prepEl.innerHTML = '';
  const prepItems  = data.suggestedPrepEn || data.suggestedPrepFr || [];
  prepItems.forEach(item => {
    const div       = document.createElement('div');
    div.className   = 'prep-item';
    div.textContent = item;
    prepEl.appendChild(div);
  });

  const confirmBtn = document.getElementById('btn-confirm');
  confirmBtn.disabled    = false;
  confirmBtn.textContent = '✔ CONFIRM — Direct patient here / Diriger le patient ici';
  confirmBtn.style.background = '';

  initMap(data.latitude, data.longitude);
}

// ── Map ────────────────────────────────────────────────────────────────
function initMap(lat, lng) {
  if (!map) {
    map = L.map('map').setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
  } else {
    map.setView([lat, lng], 14);
    if (alertMarker) map.removeLayer(alertMarker);
  }

  const redIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;
      background:#CC0000;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(204,0,0,0.4);
      animation:mapPulse 1.4s infinite;
    "></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9]
  });

  alertMarker = L.marker([lat, lng], { icon: redIcon })
    .addTo(map)
    .bindPopup('<strong>Victim location / Victime</strong>')
    .openPopup();

  if (hospital.latitude && hospital.longitude) {
    L.marker([hospital.latitude, hospital.longitude], {
      icon: L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;
          background:#1565C0;
          border:3px solid #fff;
          border-radius:50%;
        "></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7]
      })
    }).addTo(map).bindPopup(`<strong>${hospital.name}</strong>`);
  }

  setTimeout(() => map.invalidateSize(), 200);
}

// ── Confirm alert ──────────────────────────────────────────────────────
async function confirmAlert() {
  if (!currentAlert) return;
  const btn = document.getElementById('btn-confirm');
  btn.disabled    = true;
  btn.textContent = 'Sending confirmation...';
  try {
    const res = await fetch(`${API_URL}/api/alerts/${currentAlert.alertId}/confirm`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      btn.textContent      = '✔ Confirmed — Guidance sent to bystander';
      btn.style.background = '#1b5e20';

      // ── Keep local free_capacity in sync with the server ──────────
      // The server decremented it on confirm — mirror that here so the
      // Status tab shows the correct bed count without a page reload.
      if (hospital.free_capacity > 0) {
        hospital.free_capacity -= 1;
        sessionStorage.setItem('ecrs_hospital', JSON.stringify(hospital));
        const bedsInput = document.getElementById('beds-input');
        if (bedsInput) bedsInput.value = hospital.free_capacity;
      }

      setTimeout(resetToStandby, 4000);
    } else {
      const err       = await res.json();
      btn.disabled    = false;
      btn.textContent = `Error: ${err.error || 'Try again'}`;
    }
  } catch (e) {
    btn.disabled    = false;
    btn.textContent = 'Network error — retry';
  }
}

// ── Decline alert ──────────────────────────────────────────────────────
async function declineAlert() {
  if (!currentAlert) return;
  if (!confirm('Decline this emergency? It will be redirected to another hospital.')) return;
  try {
    await fetch(`${API_URL}/api/alerts/${currentAlert.alertId}/decline`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }
    });
    resetToStandby();
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

// ── Resolve case ───────────────────────────────────────────────────────
async function resolveCase(alertId) {
  const existing = document.getElementById('resolve-modal');
  if (existing) existing.remove();

  const modal       = document.createElement('div');
  modal.id          = 'resolve-modal';
  modal.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);
      border-radius:16px;padding:28px;width:100%;max-width:360px;text-align:center;">
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">
        Resolve Case
      </div>
      <div style="color:var(--muted);font-size:13px;margin-bottom:20px">
        Select the final outcome for this patient
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        <button onclick="submitResolve(${alertId},'TREATED')"
          style="padding:14px;border-radius:10px;border:none;background:rgba(34,197,94,0.15);
          color:#22C55E;font-size:15px;font-weight:600;cursor:pointer;">
          ✓ TREATED — Patient treated successfully
        </button>
        <button onclick="submitResolve(${alertId},'TRANSFERRED')"
          style="padding:14px;border-radius:10px;border:none;background:rgba(249,115,22,0.15);
          color:var(--orange);font-size:15px;font-weight:600;cursor:pointer;">
          ↗ TRANSFERRED — Sent to another facility
        </button>
        <button onclick="submitResolve(${alertId},'FALSE_ALARM')"
          style="padding:14px;border-radius:10px;border:none;background:rgba(156,163,175,0.15);
          color:var(--muted);font-size:15px;font-weight:600;cursor:pointer;">
          ✗ FALSE ALARM
        </button>
        <button onclick="submitResolve(${alertId},'DECEASED')"
          style="padding:14px;border-radius:10px;border:none;background:rgba(239,68,68,0.15);
          color:var(--red);font-size:15px;font-weight:600;cursor:pointer;">
          † DECEASED
        </button>
      </div>
      <button onclick="document.getElementById('resolve-modal').remove()"
        style="background:none;border:1px solid var(--border);color:var(--muted);
        padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;">
        Cancel
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function submitResolve(alertId, outcome) {
  document.getElementById('resolve-modal').remove();
  try {
    const res = await fetch(`${API_URL}/api/alerts/${alertId}/resolve`, {
      method:  'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ outcome })
    });
    if (res.ok) {
    const data = await res.json();
    loadCaseHistory();
    // ── Sync free_capacity exactly from server response ────────────
    // The server returns the real updated value — use that instead of
    // guessing so the beds display is always accurate.
    if (data.free_capacity !== null && data.free_capacity !== undefined) {
      hospital.free_capacity = data.free_capacity;
      if (data.total_capacity !== undefined) hospital.total_capacity = data.total_capacity;
      sessionStorage.setItem('ecrs_hospital', JSON.stringify(hospital));
      const bedsInput = document.getElementById('beds-input');
      if (bedsInput) bedsInput.value = hospital.free_capacity;
    }
  }
  } catch (e) {
    console.error('submitResolve error:', e);
  }
}

// ── Save capacity ──────────────────────────────────────────────────────
async function saveCapacity() {
  const freeCapacity = parseInt(document.getElementById('beds-input').value) || 0;

  try {
    const res = await fetch(`${API_URL}/api/institutions/me/capacity`, {
      method:  'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ free_capacity: freeCapacity })
    });

    const btn = document.querySelector('#tab-status .save-btn');
    if (res.ok) {
      hospital.free_capacity = freeCapacity;
      sessionStorage.setItem('ecrs_hospital', JSON.stringify(hospital));
      btn.textContent      = '✔ Saved';
      btn.style.background = '#1b5e20';
      setTimeout(() => { btn.textContent = 'Save / Enregistrer'; btn.style.background = ''; }, 2000);
    } else {
      alert('Failed to save. Please try again.');
    }
  } catch (e) {
    alert('Network error.');
  }
}

// ── Profile form: build checkboxes once ───────────────────────────────
function buildProfileForm() {
  const eqGrid = document.getElementById('equipment-checks');
  const prGrid = document.getElementById('personnel-checks');
  if (!eqGrid || !prGrid) return;

  eqGrid.innerHTML = EQUIPMENT_OPTIONS.map(opt => `
    <label class='check-item'>
      <input type='checkbox' class='eq-check' value='${opt.val}'>
      ${opt.label}
    </label>
  `).join('');

  prGrid.innerHTML = PERSONNEL_OPTIONS.map(opt => `
    <label class='check-item'>
      <input type='checkbox' class='pr-check' value='${opt.val}'>
      ${opt.label}
    </label>
  `).join('');
}

// ── Profile form: pre-fill from stored hospital data ──────────────────
function fillProfileForm() {
  document.getElementById('p-name').value    = hospital.name    || '';
  document.getElementById('p-phone').value   = hospital.phone   || '';
  document.getElementById('p-address').value = hospital.address || '';
  document.getElementById('p-total').value   = hospital.total_capacity || '';
  document.getElementById('p-free').value    = hospital.free_capacity  || '';

  // Parse equipment / personnel (may be JSON string or array)
  let eq = [];
  let pr = [];
  try { eq = Array.isArray(hospital.equipment) ? hospital.equipment : JSON.parse(hospital.equipment || '[]'); } catch { eq = []; }
  try { pr = Array.isArray(hospital.personnel) ? hospital.personnel : JSON.parse(hospital.personnel || '[]'); } catch { pr = []; }

  document.querySelectorAll('.eq-check').forEach(cb => {
    cb.checked = eq.includes(cb.value);
  });
  document.querySelectorAll('.pr-check').forEach(cb => {
    cb.checked = pr.includes(cb.value);
  });
}

// ── Save profile ───────────────────────────────────────────────────────
async function saveProfile() {
  const name  = document.getElementById('p-name').value.trim();
  const phone = document.getElementById('p-phone').value.trim();
  const addr  = document.getElementById('p-address').value.trim();
  const total = parseInt(document.getElementById('p-total').value) || 0;
  const free  = parseInt(document.getElementById('p-free').value)  || 0;

  const equipment = [...document.querySelectorAll('.eq-check:checked')].map(c => c.value);
  const personnel = [...document.querySelectorAll('.pr-check:checked')].map(c => c.value);

  const btn = document.getElementById('profile-save-btn');
  const msg = document.getElementById('profile-msg');

  if (!name) {
    msg.style.color   = 'var(--red)';
    msg.textContent   = '⚠ Hospital name is required.';
    return;
  }
  if (equipment.length === 0) {
    msg.style.color   = 'var(--red)';
    msg.textContent   = '⚠ Select at least one piece of equipment.';
    return;
  }
  if (personnel.length === 0) {
    msg.style.color   = 'var(--red)';
    msg.textContent   = '⚠ Select at least one type of personnel.';
    return;
  }

  btn.textContent = 'Saving...';
  btn.disabled    = true;
  msg.textContent = '';

  try {
    const res = await fetch(`${API_URL}/api/institutions/me/profile`, {
      method:  'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name, phone, address: addr,
        total_capacity: total, free_capacity: free,
        equipment, personnel
      })
    });

    const data = await res.json();

    if (res.ok) {
      // Update local session with fresh data from server
      hospital = { ...hospital, ...data.institution };
      sessionStorage.setItem('ecrs_hospital', JSON.stringify(hospital));

      // Update header name if changed
      document.getElementById('hosp-name').textContent = hospital.name;

      btn.textContent    = '✔ Saved';
      btn.style.background = '#1b5e20';
      msg.style.color    = '#22C55E';
      msg.textContent    = 'Profile updated successfully.';

      setTimeout(() => {
        btn.textContent      = '💾 Save Profile';
        btn.style.background = '';
        btn.disabled         = false;
        msg.textContent      = '';
      }, 3000);
    } else {
      msg.style.color = 'var(--red)';
      msg.textContent = `⚠ ${data.error || 'Failed to save. Try again.'}`;
      btn.textContent = '💾 Save Profile';
      btn.disabled    = false;
    }

  } catch (e) {
    msg.style.color = 'var(--red)';
    msg.textContent = '⚠ Network error. Check your connection.';
    btn.textContent = '💾 Save Profile';
    btn.disabled    = false;
  }
}

// ── Case history ───────────────────────────────────────────────────────
async function loadCaseHistory() {
  try {
    const res  = await fetch(`${API_URL}/api/institutions/me/cases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const rows = await res.json();
    const el   = document.getElementById('case-history');

    if (!rows.length) {
      el.innerHTML = '<p style="color:var(--muted);font-size:13px">No cases yet</p>';
      return;
    }

    el.innerHTML = rows.map(c => {
      let statusBadge = '';
      let timeStr     = '';

      if (c.outcome) {
        const colors = {
          TREATED:     '#4caf50',
          FALSE_ALARM: '#888',
          DECEASED:    '#f44336',
          TRANSFERRED: '#ff9800'
        };
        statusBadge = `<span style="color:${colors[c.outcome]||'#999'};font-weight:700">✔ ${c.outcome.replace(/_/g,' ')}</span>`;
        timeStr     = c.closed_at ? new Date(c.closed_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}) : '';
      } else if (c.confirmed_at) {
        statusBadge = '<span style="color:#10B981;font-weight:700">✅ CONFIRMED</span>';
        timeStr     = new Date(c.confirmed_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
      } else if (c.declined_at) {
        statusBadge = '<span style="color:#EF4444;font-weight:700">❌ DECLINED</span>';
        timeStr     = new Date(c.declined_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
      } else {
        statusBadge = '<span style="color:#F59E0B;font-weight:700">⏳ PENDING</span>';
      }

      const situation = (c.situation || '—').replace(/_/g,' ');
      const typeLabel = c.emergency_type ? `[${c.emergency_type}] ` : '';

      return `
        <div class="case-row">
          <div class="case-sit">${typeLabel}${situation}</div>
          <div class="case-meta">${statusBadge} · ${timeStr}</div>
          ${(c.confirmed_at && !c.outcome)
            ? `<button class="resolve-btn" onclick="resolveCase(${c.alertId})">Mark Resolved</button>`
            : ''}
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error('loadCaseHistory error:', e);
  }
}

// ── Reset to standby ───────────────────────────────────────────────────
function resetToStandby() {
  currentAlert = null;
  document.getElementById('alert-panel').classList.remove('active');
  document.getElementById('standby').style.display = 'block';
  const btn = document.getElementById('btn-confirm');
  btn.disabled         = false;
  btn.textContent      = '✔ CONFIRM — Direct patient here / Diriger le patient ici';
  btn.style.background = '';
  loadCaseHistory();
}

// ── Account status badge ───────────────────────────────────────────────
function updateStatusBadge(status) {
  const colors = {
    approved:  { bg: '#14532d', color: '#4ade80', text: '✅ APPROVED' },
    suspended: { bg: '#450a0a', color: '#f87171', text: '⛔ SUSPENDED' },
    pending:   { bg: '#422006', color: '#fb923c', text: '⏳ PENDING APPROVAL' }
  };
  const cfg = colors[status] || colors['pending'];
  const style = `background:${cfg.bg};color:${cfg.color};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.05em`;

  const pills = [
    document.getElementById('account-status-badge'),
    document.getElementById('header-status-badge')
  ];
  pills.forEach(el => {
    if (el) { el.textContent = cfg.text; el.style.cssText = style; }
  });
}

// ── Alarm sound ────────────────────────────────────────────────────────
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6].forEach(offset => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type            = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime  + offset + 0.25);
    });
  } catch (e) { /* silent fail */ }
}

// ── Suspended screen ───────────────────────────────────────────────────
function showSuspendedScreen(message) {
  sessionStorage.clear();
  document.body.innerHTML = `
    <div style="min-height:100vh;background:#060910;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:24px;padding:40px;
      font-family:'DM Sans',sans-serif;text-align:center;">
      <div style="width:80px;height:80px;border-radius:50%;background:rgba(239,68,68,0.15);
        border:2px solid #EF4444;display:flex;align-items:center;justify-content:center;font-size:36px;">
        🚫
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#EF4444;letter-spacing:1px;">
        Account Suspended
      </div>
      <div style="font-size:15px;color:#9CA3AF;max-width:420px;line-height:1.7;">
        ${message}
      </div>
      <div style="font-size:13px;color:#6B7280;padding:12px 24px;background:#111827;
        border:1px solid #374151;border-radius:10px;">
        Contact the ECRS administrator to resolve this issue.
      </div>
      <a href="index.html" style="font-size:14px;color:#3B82F6;text-decoration:none;">
        ← Return to login
      </a>
    </div>
  `;
}
