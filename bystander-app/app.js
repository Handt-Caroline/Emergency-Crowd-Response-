// API_URL auto-detects: works on localhost AND on your deployed server
const API_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
  ? window.location.origin
  : 'http://localhost:3000';

// ── State ──────────────────────────────────────────────────────────────
const state = {
  type:             null,
  situation:        null,
  situationLabel:   null,   // human-readable, used for "Other" description
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
    { emoji: '😵', en: 'Unconscious',        fr: 'Inconscient',       val: 'UNCONSCIOUS'       },
    { emoji: '🫁', en: 'Not breathing',      fr: 'Ne respire pas',    val: 'NOT_BREATHING'     },
    { emoji: '💔', en: 'Chest pain',         fr: 'Douleur thorax',    val: 'CHEST_PAIN'        },
    { emoji: '🫀', en: 'Cardiac arrest',     fr: 'Arrêt cardiaque',   val: 'CARDIAC_ARREST'    },
    { emoji: '🩸', en: 'Severe bleeding',    fr: 'Saignement grave',  val: 'SEVERE_BLEEDING'   },
    { emoji: '🚗', en: 'Accident / Trauma',  fr: 'Accident',          val: 'ACCIDENT_TRAUMA'   },
    { emoji: '🔥', en: 'Burn',               fr: 'Brûlure',           val: 'BURN'              },
    { emoji: '🧠', en: 'Stroke / AVC',       fr: 'AVC',               val: 'STROKE'            },
    { emoji: '⚡', en: 'Seizure',            fr: 'Convulsion',        val: 'SEIZURE'           },
    { emoji: '👶', en: 'Child emergency',    fr: 'Urgence enfant',    val: 'CHILD_EMERGENCY'   },
    { emoji: '🤰', en: 'Childbirth',         fr: 'Accouchement',      val: 'CHILDBIRTH'        },
    { emoji: '🤧', en: 'Allergic reaction',  fr: 'Réaction allerg.',  val: 'ALLERGIC_REACTION' },
    { emoji: '✏️', en: 'Other',              fr: 'Autre',             val: 'OTHER', isOther: true },
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

  // Build situation grid
  const container = document.getElementById('sit-buttons');
  container.innerHTML = '';

  SITUATIONS[type].forEach(sit => {
    const btn = document.createElement('button');
    btn.className = sit.isOther ? 'sit-btn other-btn' : 'sit-btn';
    btn.innerHTML = `
      <span class='sit-emoji'>${sit.emoji}</span>
      <strong>${sit.en}</strong><br>
      <span style='font-size:10px;color:var(--text-muted)'>${sit.fr}</span>
    `;
    btn.onclick = () => selectSituation(sit);
    container.appendChild(btn);
  });

  goTo(3);
}

// ══ Select situation ═══════════════════════════════════════════════════
function selectSituation(sit) {
  state.situation      = sit.val;
  state.situationLabel = sit.en;

  if (sit.isOther) {
    // Go to free-text screen
    // Victim back button should go back to 3b (other screen)
    document.getElementById('victim-back-btn').onclick = () => goTo('3b');
    goTo('3b');

    // Character counter
    const ta = document.getElementById('other-description');
    ta.value = '';
    ta.oninput = () => {
      const rem = 300 - ta.value.length;
      document.getElementById('char-remaining').textContent = rem;
    };
  } else {
    // Normal flow — go straight to victim count
    state.otherDescription = null;
    document.getElementById('victim-back-btn').onclick = () => goTo(3);
    goTo(4);
  }
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
// On mobile: opens the back camera directly
// On desktop: opens a file picker (no camera available)
function openCamera() {
  document.getElementById('input-camera').click();
}

// ══ Photo — Gallery ═══════════════════════════════════════════════════
// On mobile: opens the photo library (no camera)
// On desktop: opens a file picker
function openGallery() {
  document.getElementById('input-gallery').click();
}

// ══ Handle selected photo ════════════════════════════════════════════
function handlePhotoSelect(input) {
  const file = input.files[0];
  if (!file) return;
  state.photoFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('photo-preview').src = e.target.result;
    document.getElementById('photo-preview-wrap').style.display = 'flex';
    document.getElementById('photo-preview-wrap').style.flexDirection = 'column';
  };
  reader.readAsDataURL(file);

  // Reset other input so the same file can be re-selected if needed
  document.getElementById('input-camera').value  = '';
  document.getElementById('input-gallery').value = '';
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
function captureGPSandSend() {
  if (!navigator.geolocation) { showGPSError(); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => sendAlert(pos.coords.latitude, pos.coords.longitude),
    ()    => showGPSError(),
    { timeout: 12000, enableHighAccuracy: true }
  );
}

// ══ Send alert to backend ══════════════════════════════════════════════
async function sendAlert(lat, lng) {
  try {
    const name  = (document.getElementById('input-name')?.value  || '').trim();
    const phone = (document.getElementById('input-phone')?.value || '').trim();

    // If user picked "Other", we append their description to the situation
    // so the hospital sees it
    const situationNote = state.otherDescription
      ? `OTHER: ${state.otherDescription}`
      : state.situation;

    let res;

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
      res = await fetch(`${API_URL}/api/alerts`, { method: 'POST', body: form });

    } else {
      res = await fetch(`${API_URL}/api/alerts`, {
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
      });
    }

    const data = await res.json();
    if (!res.ok || !data.alertId) { showNetworkError(); return; }

    state.alertId = data.alertId;
    joinAlertRoom(data.alertId);

  } catch (err) {
    console.error('[ECRS] sendAlert error:', err);
    showNetworkError();
  }
}

// ══ Join socket room ═══════════════════════════════════════════════════
function joinAlertRoom(alertId) {
  if (!state.socket) state.socket = io(API_URL);
  state.socket.emit('join_alert_room', alertId);

  state.socket.on('alert:confirmed',  (guidance) => showGuidance(guidance));
  state.socket.on('alert:reassigned', () => {
    const t = document.querySelector('.loading-text');
    if (t) t.innerHTML = 'Contacting next hospital…<br>Contacte le prochain hôpital…';
  });
  state.socket.on('alert:failed', (data) => showFailed(data));
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
  state.situation = null;
  state.situationLabel = null;
  state.otherDescription = null;
  state.count = null;
  state.alertId = null;
  state.photoFile = null;
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