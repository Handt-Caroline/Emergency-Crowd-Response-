// API_URL auto-detects: works on localhost AND on your deployed server
const API_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
  ? window.location.origin
  : 'http://localhost:3000';

// ── State ──────────────────────────────────────────────────────────────
const state = {
  type:             null,
  situations:       [],     // ARRAY of selected symptoms (multi-select)
  situationLabels:  [],     // human-readable labels for selected symptoms
  otherDescription: null,   // free text when user picks "Other"
  count:            null,
  alertId:          null,
  socket:           null,
  photoFile:        null,
};

// ═══════════════════════════════════════════════════════════════════════
// SITUATIONS — each entry has emoji, EN label, FR label, DB value
// ═══════════════════════════════════════════════════════════════════════
const SITUATIONS = {
  MEDICAL: [
    { emoji: '😵', en: 'Person collapsed',    fr: 'Personne effondrée', val: 'UNCONSCIOUS'           },
    { emoji: '🫁', en: 'Not breathing',       fr: 'Ne respire pas',     val: 'NOT_BREATHING'         },
    { emoji: '💔', en: 'Chest pain',          fr: 'Douleur thorax',     val: 'CHEST_PAIN'            },
    { emoji: '🩸', en: 'Severe bleeding',     fr: 'Saignement grave',   val: 'SEVERE_BLEEDING'       },
    { emoji: '🚗', en: 'Accident / Crash',    fr: 'Accident',           val: 'ACCIDENT_TRAUMA'       },
    { emoji: '🔥', en: 'Burn',                fr: 'Brûlure',            val: 'BURN'                  },
    { emoji: '😶', en: 'Face drooping',       fr: 'Visage tombant',     val: 'FACE_DROOPING'         },
    { emoji: '🗣️', en: 'Slurred speech',      fr: 'Parole confuse',     val: 'SLURRED_SPEECH'        },
    { emoji: '⚡', en: 'Body shaking',        fr: 'Convulsions',        val: 'SEIZURE'               },
    { emoji: '🫨', en: 'Cold sweat / Pale',   fr: 'Sueur froide',       val: 'COLD_SWEAT'            },
    { emoji: '👶', en: 'Child unconscious',   fr: 'Enfant inconscient', val: 'CHILD_EMERGENCY'       },
    { emoji: '🤰', en: 'Childbirth / Labor',  fr: 'Accouchement',       val: 'CHILDBIRTH'            },
    { emoji: '😷', en: 'Trouble breathing',   fr: 'Difficulté respirer',val: 'BREATHING_DIFFICULTY'  },
    { emoji: '🤮', en: 'Vomiting blood',      fr: 'Vomit du sang',      val: 'VOMITING_BLOOD'        },
    { emoji: '✏️', en: 'Other',               fr: 'Autre',              val: 'OTHER', isOther: true  },
  ],
  FIRE: [
    { emoji: '🏠', en: 'House fire',         fr: 'Incendie maison',   val: 'FIRE_BUILDING'     },
    { emoji: '🧑‍🔥', en: 'Person on fire',  fr: 'Personne en feu',   val: 'BURN'              },
    { emoji: '💨', en: 'Gas leak',           fr: 'Fuite de gaz',      val: 'GAS_LEAK'          },
    { emoji: '✏️', en: 'Other',              fr: 'Autre',             val: 'OTHER', isOther: true },
  ],
  SECURITY: [
    { emoji: '👊', en: 'Assault',            fr: 'Agression',         val: 'ASSAULT'           },
    { emoji: '🔫', en: 'Armed person',       fr: 'Personne armée',    val: 'ARMED_THREAT'      },
    { emoji: '✏️', en: 'Other',              fr: 'Autre',             val: 'OTHER', isOther: true },
  ]
};

// ══ Screen navigation ══════════════════════════════════════════════════
function goTo(num) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${num}`);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
}

// ══ Coming Soon ════════════════════════════════════════════════════════
function showComingSoon(name) {
  document.getElementById('screen6-content').innerHTML = `
    <div class='failed-card'>
      <div class='failed-icon'>🚧</div>
      <div class='failed-title' style='color:var(--orange)'>Coming Soon</div>
      <div class='failed-sub'>
        <strong>${name}</strong> module is not active yet.<br>
        Pour l'instant, appelez directement les secours :
      </div>
      <a href='tel:15'  class='emergency-btn'>SAMU — 15</a>
      <a href='tel:18'  class='emergency-btn' style='background:linear-gradient(135deg,#F59E0B,#B45309);box-shadow:0 6px 24px rgba(245,158,11,0.35)'>Pompiers — 18</a>
      <a href='tel:17'  class='emergency-btn' style='background:linear-gradient(135deg,#3B82F6,#1D4ED8);box-shadow:0 6px 24px rgba(59,130,246,0.35)'>Police — 17</a>
      <button class='emergency-btn secondary' onclick='goTo(1)'>← Back / Retour</button>
    </div>
  `;
  goTo(6);
}

// ══ Select emergency type ══════════════════════════════════════════════
function selectType(type) {
  state.type = type;
  // Reset selections when changing type
  state.situations = [];
  state.situationLabels = [];
  updateContinueButton();

  // Build situation grid
  const container = document.getElementById('sit-buttons');
  container.innerHTML = '';

  SITUATIONS[type].forEach(sit => {
    const btn = document.createElement('button');
    btn.className = sit.isOther ? 'sit-btn other-btn' : 'sit-btn';
    btn.dataset.val = sit.val;
    btn.innerHTML = `
      <span class='sit-emoji'>${sit.emoji}</span>
      <strong>${sit.en}</strong><br>
      <span style='font-size:10px;color:var(--text-muted)'>${sit.fr}</span>
    `;
    btn.onclick = () => toggleSituation(sit, btn);
    container.appendChild(btn);
  });

  goTo(3);
}

// ══ Toggle situation selection (multi-select) ══════════════════════════
function toggleSituation(sit, btn) {
  // OTHER button always opens the description screen (single behavior)
  if (sit.isOther) {
    state.situations = ['OTHER'];
    state.situationLabels = ['Other'];
    document.getElementById('victim-back-btn').onclick = () => goTo('3b');
    goTo('3b');

    // Character counter
    const ta = document.getElementById('other-description');
    ta.value = '';
    ta.oninput = () => {
      const rem = 300 - ta.value.length;
      document.getElementById('char-remaining').textContent = rem;
    };
    return;
  }

  // For regular symptoms, toggle add/remove from array
  const idx = state.situations.indexOf(sit.val);
  if (idx === -1) {
    state.situations.push(sit.val);
    state.situationLabels.push(sit.en);
    btn.classList.add('selected');
  } else {
    state.situations.splice(idx, 1);
    state.situationLabels.splice(idx, 1);
    btn.classList.remove('selected');
  }
  updateContinueButton();
}

// ══ Update Continue button visibility/enabled state ════════════════════
function updateContinueButton() {
  const btn = document.getElementById('continue-symptoms-btn');
  if (!btn) return;
  if (state.situations.length > 0) {
    btn.disabled = false;
    btn.classList.remove('disabled');
    const counter = document.getElementById('symptom-counter');
    if (counter) counter.textContent = `${state.situations.length} selected`;
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
    const counter = document.getElementById('symptom-counter');
    if (counter) counter.textContent = 'Select at least one';
  }
}

// ══ Confirm symptoms and go to victim count ════════════════════════════
function confirmSymptoms() {
  if (state.situations.length === 0) return; // Should not happen if button disabled
  state.otherDescription = null;
  document.getElementById('victim-back-btn').onclick = () => goTo(3);
  goTo(4);
}

// ══ Confirm "Other" description ════════════════════════════════════════
function confirmOther() {
  const text = document.getElementById('other-description').value.trim();
  if (!text) {
    document.getElementById('other-description').style.borderColor = 'var(--red)';
    document.getElementById('other-description').placeholder =
      'Please describe the situation / Veuillez décrire la situation';
    return;
  }
  state.otherDescription = text;
  document.getElementById('victim-back-btn').onclick = () => goTo('3b');
  goTo(4);
}

// ══ Select victim count ════════════════════════════════════════════════
function selectCount(count) {
  state.count = count;
  goTo(5);
}

// ══ Photo — Camera ════════════════════════════════════════════════════
function openCamera() {
  document.getElementById('input-camera').click();
}

// ══ Photo — Gallery ═══════════════════════════════════════════════════
function openGallery() {
  document.getElementById('input-gallery').click();
}

// ══ Handle selected photo ════════════════════════════════════════════
function handlePhotoSelect(input) {
  const file = input.files[0];
  if (!file) return;

  // Compress the photo on the phone BEFORE storing/sending.
  // Shrinks a 10MB camera photo to ~400KB so upload is fast and the
  // server never chokes. The bystander notices nothing.
  compressImage(file, 1280, 0.7).then(compressedBlob => {
    state.photoFile = new File([compressedBlob], 'photo.jpg', { type: 'image/jpeg' });
    showPhotoPreview(state.photoFile);
  }).catch(err => {
    console.warn('[ECRS] Compression failed, using original:', err);
    state.photoFile = file;
    showPhotoPreview(file);
  });

  document.getElementById('input-camera').value  = '';
  document.getElementById('input-gallery').value = '';
}

// Show preview thumbnail from a file/blob
function showPhotoPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('photo-preview').src = e.target.result;
    document.getElementById('photo-preview-wrap').style.display = 'flex';
    document.getElementById('photo-preview-wrap').style.flexDirection = 'column';
  };
  reader.readAsDataURL(fileOrBlob);
}

// Compress an image using canvas. Resizes so the longest side is at most
// maxSize px, re-encodes as JPEG at the given quality (0-1). Returns Promise<Blob>.
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > height && width > maxSize) {
        height = Math.round(height * (maxSize / width));
        width = maxSize;
      } else if (height >= width && height > maxSize) {
        width = Math.round(width * (maxSize / height));
        height = maxSize;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('toBlob null')),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

// ══ Remove photo ═══════════════════════════════════════════════════════
function removePhoto() {
  state.photoFile = null;
  document.getElementById('photo-preview').src = '';
  document.getElementById('photo-preview-wrap').style.display = 'none';
}

// ══ Submit & Send ══════════════════════════════════════════════════════
function submitAndSend() {
  goTo(6);
  showLoadingScreen();
  captureGPSandSend();
}

// ══ Loading screen ══════════════════════════════════════════════════════
function showLoadingScreen() {
  document.getElementById('screen6-content').innerHTML = `
    <div class='loading-wrap'>
      <div class='spinner-ring'></div>
      <div class='loading-text'>Finding help near you…<br>Recherche d'aide en cours…</div>
      <div class='loading-sub'>Locating the nearest available hospital.<br>Localisation de l'hôpital le plus proche.</div>
    </div>
  `;
}

// ══ GPS capture ════════════════════════════════════════════════════════
// Two-stage strategy with a "fire once" guard:
//   1. Try FAST/low-accuracy first (works indoors via WiFi + cell towers).
//   2. If that fails OR is slow, try high-accuracy in parallel.
// Whichever returns FIRST wins — and the guard ensures we send the alert
// only ONCE, never twice, and never leave the screen stuck.
let gpsAlreadySent = false;

function captureGPSandSend() {
  if (!navigator.geolocation) { showGPSError(); return; }

  gpsAlreadySent = false;
  let stage1Failed = false;
  let stage2Failed = false;

  // Helper — send the alert only the FIRST time we get a position
  const onLocation = (pos) => {
    if (gpsAlreadySent) return;       // already handled — ignore the slower one
    gpsAlreadySent = true;
    sendAlert(pos.coords.latitude, pos.coords.longitude);
  };

  // If BOTH stages fail, then show the error
  const checkBothFailed = () => {
    if (stage1Failed && stage2Failed && !gpsAlreadySent) {
      showGPSError();
    }
  };

  // Stage 1: fast, low-accuracy — works indoors (WiFi + cell towers)
  navigator.geolocation.getCurrentPosition(
    onLocation,
    () => { stage1Failed = true; checkBothFailed(); },
    { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
  );

  // Stage 2: high-accuracy — runs IN PARALLEL (not after).
  // Whichever finishes first wins thanks to the gpsAlreadySent guard.
  navigator.geolocation.getCurrentPosition(
    onLocation,
    () => { stage2Failed = true; checkBothFailed(); },
    { timeout: 20000, enableHighAccuracy: true, maximumAge: 30000 }
  );
}

// ══ Send alert to backend ══════════════════════════════════════════════
async function sendAlert(lat, lng) {
  try {
    const name  = (document.getElementById('input-name')?.value  || '').trim();
    const phone = (document.getElementById('input-phone')?.value || '').trim();

    // Build situation string from selected symptoms
    // For OTHER, include the description text
    // Otherwise, send all selected symptoms as comma-separated
    let situationNote;
    if (state.otherDescription) {
      situationNote = `OTHER: ${state.otherDescription}`;
    } else {
      situationNote = state.situations.join(',');
    }

    // Build the request (FormData if photo, JSON otherwise)
    let fetchOptions;
    if (state.photoFile) {
      const form = new FormData();
      form.append('device_id',      generateDeviceId());
      form.append('emergency_type', state.type);
      form.append('situation',      situationNote);
      form.append('victims_count',  state.count);
      form.append('latitude',       lat);
      form.append('longitude',      lng);
      if (name)  form.append('bystander_name',  name);
      if (phone) form.append('bystander_phone', phone);
      form.append('photo', state.photoFile, state.photoFile.name);
      fetchOptions = { method: 'POST', body: form };
    } else {
      fetchOptions = {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          device_id:       generateDeviceId(),
          emergency_type:  state.type,
          situation:       situationNote,
          victims_count:   state.count,
          latitude:        lat,
          longitude:       lng,
          bystander_name:  name  || undefined,
          bystander_phone: phone || undefined,
        })
      };
    }

    // Send with automatic retry — handles brief network drops and
    // the 1-2s window during a server restart.
    const data = await sendWithRetry(`${API_URL}/api/alerts`, fetchOptions, 3);

    if (!data || !data.alertId) { showNetworkError(); return; }

    state.alertId = data.alertId;
    joinAlertRoom(data.alertId);

  } catch (err) {
    console.error('[ECRS] sendAlert error:', err);
    showNetworkError();
  }
}

// ══ Fetch with retry ═══════════════════════════════════════════════════
// Tries up to maxAttempts times, waiting a bit longer between each.
// This fixes the "cannot reach server" error caused by brief network
// hiccups or a server that is restarting.
async function sendWithRetry(url, options, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return await res.json();
      }
      // If server responded with an error status, do not retry (it is not a network issue)
      if (res.status >= 400 && res.status < 500) {
        const errData = await res.json().catch(() => ({}));
        console.warn('[ECRS] Server rejected request:', res.status, errData);
        return null;
      }
      // 5xx server error — worth retrying
      console.warn(`[ECRS] Attempt ${attempt} got status ${res.status}, retrying...`);
    } catch (err) {
      // Network error (server unreachable) — retry
      console.warn(`[ECRS] Attempt ${attempt} failed (network), retrying...`, err.message);
    }

    // Wait before next attempt (1s, then 2s, then 3s)
    if (attempt < maxAttempts) {
      const t = document.querySelector('.loading-text');
      if (t) t.innerHTML = `Connecting… (try ${attempt + 1})<br>Connexion…`;
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  return null;  // all attempts failed
}

// ══ Join socket room ═══════════════════════════════════════════════════
function joinAlertRoom(alertId) {
  if (!state.socket) state.socket = io(API_URL);
  state.socket.emit('join_alert_room', alertId);

  // When alert is dispatched, server sends top 3 hospital list immediately
  state.socket.on('alert:dispatched', (data) => showDispatchedTop3(data));

  state.socket.on('alert:confirmed',  (guidance) => showGuidance(guidance));
  state.socket.on('alert:reassigned', () => {
    const t = document.querySelector('.loading-text');
    if (t) t.innerHTML = 'Contacting next hospital…<br>Contacte le prochain hôpital…';
  });
  state.socket.on('alert:failed', (data) => showFailed(data));
}

// ══ Dispatched (waiting for hospital to confirm — show top 3 immediately) ══
function showDispatchedTop3(data) {
  const primary = data.primary;
  const backups = data.backups || [];

  const primaryMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${primary.latitude},${primary.longitude}`;

  const backupCardsHtml = backups.length === 0 ? '' : `
    <div class='backup-section'>
      <div class='backup-title'>📋 Backup options / Options de secours</div>
      <div class='backup-list'>
        ${backups.map((h, i) => `
          <div class='backup-card'>
            <div class='backup-rank'>${i + 2}</div>
            <div class='backup-info'>
              <div class='backup-name'>${h.name}</div>
              <div class='backup-meta'>📍 ${h.distance_km} km · ${h.free_capacity} beds</div>
            </div>
            <a href='https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}'
               target='_blank' class='backup-maps'>🗺️</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('screen6-content').innerHTML = `
    <div class='guidance-card'>
      <div class='dispatch-pending'>
        <div class='pulse-dot'></div>
        <span>Awaiting hospital confirmation...</span>
      </div>
      <div class='guidance-hospital-name'>${primary.name}</div>
      <div class='guidance-dist'>📍 ${primary.distance_km} km — selected as best match</div>
      <div class='dispatch-info'>
        <span style='font-size:18px'>⏳</span>
        <span>Alert sent. ${primary.name} is reviewing now.<br>
        <em style='color:var(--text-muted)'>Alerte envoyée. ${primary.name} examine maintenant.</em></span>
      </div>
      <a href='${primaryMapsUrl}' target='_blank' class='maps-btn'>
        🗺️ Get Directions to ${primary.name}
      </a>
      ${primary.phone
        ? `<a href='tel:${primary.phone}' class='call-btn'>📞 Call Hospital</a>`
        : ''}
      ${backupCardsHtml}
    </div>
  `;
}

// ══ Guidance (confirmed) ═══════════════════════════════════════════════
function showGuidance(guidance) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${guidance.hospital_lat},${guidance.hospital_lng}`;
  document.getElementById('screen6-content').innerHTML = `
    <div class='guidance-card'>
      <div class='guidance-confirmed'>✓ HOSPITAL CONFIRMED</div>
      <div class='guidance-hospital-name'>${guidance.hospital_name}</div>
      <div class='guidance-dist'>📍 ${guidance.distance_km} km from you</div>
      <div class='guidance-notified'>
        <span style='font-size:18px'>✅</span>
        <span>The hospital has been notified and is expecting you. Head there now.<br>
        <em style='color:var(--text-muted)'>L'hôpital a été notifié. Rendez-vous là-bas.</em></span>
      </div>
      ${guidance.hospital_phone
        ? `<div class='guidance-phone'>📞 ${guidance.hospital_phone}</div>`
        : ''}
      <a href='${mapsUrl}' target='_blank' class='maps-btn'>
        🗺️ Get Directions / Itinéraire
      </a>
      ${guidance.hospital_phone
        ? `<a href='tel:${guidance.hospital_phone}' class='call-btn'>📞 Call Hospital</a>`
        : ''}
      <button class='emergency-btn secondary' onclick='resetApp()'>← New Alert / Nouvelle alerte</button>
    </div>
  `;
}

// ══ Failed ════════════════════════════════════════════════════════════
function showFailed(data) {
  const nums = data.emergency_numbers || [
    { name: 'SAMU',        number: '15'  },
    { name: 'Croix-Rouge', number: '117' }
  ];
  document.getElementById('screen6-content').innerHTML = `
    <div class='failed-card'>
      <div class='failed-icon'>😔</div>
      <div class='failed-title'>No hospital available</div>
      <div class='failed-sub'>
        ${data.message_fr || data.message || 'No hospitals could accept right now.'}<br>
        Call emergency services immediately:
      </div>
      ${nums.map(n => `<a href='tel:${n.number}' class='emergency-btn'>${n.name} — ${n.number}</a>`).join('')}
      <button class='emergency-btn secondary' onclick='resetApp()'>← Try Again</button>
    </div>
  `;
}

// ══ GPS error ════════════════════════════════════════════════════════
function showGPSError() {
  document.getElementById('screen6-content').innerHTML = `
    <div class='failed-card'>
      <div class='failed-icon'>📍</div>
      <div class='failed-title'>Location needed</div>
      <div class='failed-sub'>
        Please enable GPS / Location in your browser settings and try again.<br>
        <em style='color:var(--text-muted)'>Activez la localisation et réessayez.</em>
      </div>
      <a href='tel:15' class='emergency-btn'>Call SAMU — 15</a>
      <button class='emergency-btn secondary' onclick='resetApp()'>Try Again / Réessayer</button>
    </div>
  `;
}

// ══ Network error ════════════════════════════════════════════════════
function showNetworkError() {
  document.getElementById('screen6-content').innerHTML = `
    <div class='failed-card'>
      <div class='failed-icon'>📡</div>
      <div class='failed-title'>Connection error</div>
      <div class='failed-sub'>
        Could not reach the ECRS server. Check your internet connection.<br>
        <em style='color:var(--text-muted)'>Vérifiez votre connexion internet.</em>
      </div>
      <a href='tel:15' class='emergency-btn'>Call SAMU — 15</a>
      <button class='emergency-btn secondary' onclick='resetApp()'>Try Again / Réessayer</button>
    </div>
  `;
}

// ══ Reset everything ═══════════════════════════════════════════════════
function resetApp() {
  state.type = null;
  state.situations = [];
  state.situationLabels = [];
  state.otherDescription = null;
  state.count = null;
  state.alertId = null;
  state.photoFile = null;
  gpsAlreadySent = false;
  if (state.socket) { state.socket.off(); state.socket = null; }

  // Clear form
  const nameEl  = document.getElementById('input-name');
  const phoneEl = document.getElementById('input-phone');
  const otherEl = document.getElementById('other-description');
  if (nameEl)  nameEl.value  = '';
  if (phoneEl) phoneEl.value = '';
  if (otherEl) otherEl.value = '';
  removePhoto();

  goTo(1);
}

// ══ Device ID ══════════════════════════════════════════════════════════
function generateDeviceId() {
  let id = localStorage.getItem('ecrs_device_id');
  if (!id) {
    id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('ecrs_device_id', id);
  }
  return id;
}

// ══ Service Worker ═════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/bystander/sw.js')
    .then(() => console.log('[ECRS] SW registered'))
    .catch(err => console.log('[ECRS] SW error:', err));
}