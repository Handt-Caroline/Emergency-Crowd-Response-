
# 🚨 ECRS — Emergency Crowd Response System

> A bystander-powered emergency dispatch platform. One tap on a phone alerts the nearest capable hospital — in real time.

[![Status](https://img.shields.io/badge/status-deployed-success)](http://173.249.53.17:4001/)
[![Node](https://img.shields.io/badge/node-v18-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Academic-blue)](#)
[![Course](https://img.shields.io/badge/course-OOADI-purple)](#)

---

## 🌍 Live Demo

| Service | URL |
|---|---|
| 🚨 **Bystander App** | http://173.249.53.17:4001/bystander/ |
| 🏥 **Hospital Dashboard** | http://173.249.53.17:4001/hospital/ |
| 👨‍💼 **Admin Panel** | http://173.249.53.17:4001/admin/ |
| 👥 **About Us** | http://173.249.53.17:4001/about/about.html |

---

## 🎯 What ECRS Does

When someone witnesses a medical emergency, panic blocks rational thought. ECRS solves that:

1. **Bystander** opens the app, taps the SOS button
2. **GPS captures** the exact location
3. **3 quick taps** describe the emergency type, situation, and victim count
4. **Backend dispatches** the alert to the nearest hospital with the right equipment
5. **Hospital dashboard** flashes red — they confirm or decline
6. **Bystander gets directions** to the confirmed hospital

The whole flow takes under **30 seconds**.

---

## 🏗️ Architecture

```
┌──────────────┐         ┌─────────────────┐         ┌──────────────────┐
│  BYSTANDER   │  HTTPS  │   NODE SERVER   │  TCP    │   MYSQL 8        │
│  PWA (phone) │────────▶│   Express +     │────────▶│   spatial index  │
│              │ socket  │   Socket.IO     │         │   on hospitals   │
└──────────────┘         └────────┬────────┘         └──────────────────┘
                                  │ socket
                                  ▼
                         ┌─────────────────┐
                         │  HOSPITAL DASH  │
                         │  (real-time)    │
                         └─────────────────┘
```

**Stack:** Node.js · Express · Socket.IO · MySQL 8 · JWT · bcrypt · PM2 · Nginx · Vanilla JS PWA

---

## 🧪 OOP Demonstration (OOADI Course)

ECRS demonstrates 3.5 of the 4 OOP pillars in production code:

| Pillar | Where | Evidence |
|---|---|---|
|  **Encapsulation** | `src/services/DispatchEngine.js` | All dispatch logic bundled in one class with private state |
|  **Inheritance** | `src/models/Hospital.js` | `class Hospital extends Institution { super(data); ... }` |
|  **Polymorphism** | `src/models/Hospital.js` | `isCapableOf()` overridden — same name, ICU-aware behavior |
|  **Abstraction** | `src/models/Institution.js` | Acts as a base class (can be enforced via `new.target` guard) |

### Real OOP code example

```javascript
// src/models/Hospital.js — INHERITANCE + POLYMORPHISM
class Hospital extends Institution {
  constructor(data) {
    super(data);  // ← runs Institution's constructor first
    this.icuBeds = data.icuBeds || 0;
    this.hasOperatingTheatre = data.hasOperatingTheatre || false;
  }

  // OVERRIDES the parent — Hospital's version adds an ICU check
  isCapableOf(requirements) {
    const baseCheck = super.isCapableOf(requirements);
    if (!baseCheck) return false;
    if (requirements.needsICU && this.freeICUBeds <= 0) return false;
    return true;
  }
}
```

---

##  Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- MySQL 8+

### Setup

```bash
# Clone
git clone https://github.com/Handt-Caroline/Emergency-Crowd-Response-.git
cd Emergency-Crowd-Response-

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DB credentials

# Initialize database
mysql -u root -p < ecrs_database.sql

# Run
npm start
```

Open `http://localhost:3000/bystander/` in your browser.

---

## 📁 Project Structure

```
Emergency-Crowd-Response-/
├── Server.js                    # Entry point — Express + Socket.IO setup
├── ecrs_database.sql            # Schema + seed data (15 hospitals + 5 admins)
├── package.json
│
├── bystander-app/               # Public PWA — emergency reporting
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── manifest.json            # Installable on phones
│   └── sw.js                    # Service worker for offline use
│
├── hospital-dashboard/          # Hospital staff interface
│   ├── index.html               # Login
│   ├── register.html
│   └── dashboard.html           # Real-time alerts with map
│
├── admin-dashboard/             # Approval & monitoring
│   ├── index.html
│   └── admin.html
│
├── about-us/                    # Team & how-it-works pages
│
└── src/
    ├── controllers/             # Route handlers
    │   ├── alertsController.js
    │   ├── authController.js
    │   ├── adminController.js
    │   └── adminAuthController.js
    ├── models/                  # OOP classes
    │   ├── Institution.js       # Base class
    │   └── Hospital.js          # Extends Institution
    ├── services/
    │   └── DispatchEngine.js    # Core algorithm
    ├── middleware/              # JWT auth
    ├── routes/                  # Route definitions
    └── utils/
        └── categoryMapper.js    # Maps emergencies → equipment
```

---

## 🧠 Dispatch Algorithm

`DispatchEngine` scores each candidate hospital on 2 axes:

```
score = (distanceWeight × distanceScore) + (capacityWeight × capacityScore)

where:
  distanceScore = 1 - (hospital_distance / max_search_radius)
  capacityScore = hospital.freeBeds / hospital.totalBeds
  distanceWeight = 0.6
  capacityWeight = 0.4
```

The hospital with the **highest score** that has the required equipment gets the alert. If they decline, the system retries with the next best — automatically.

---

## 👥 The Team

This project was built by 5 students for the **OOADI** course — *Object-Oriented Analysis Design and Implementation*.

| Member | Role |
|---|---|
| Bisseck Handt Damarise | Scrum Master |
| **Guintang Ondoua Marie** | **Product Owner** |
| Kankeu Tene Charles | CTO |
| Fouda Mvondo Raoul | Developer |
| Christ Smith | Developer |

🇨🇲 Built in Cameroon, for Cameroon.

---

## 🛡️ Security Notes

- Passwords hashed with **bcrypt** (cost factor 10)
- **JWT** authentication for hospitals and admins (7-day expiry)
- **SQL injection** prevented via parameterized queries (`mysql2/promise`)
- **CORS** enabled, scoped configuration
- Hospital registrations require **admin approval** before going live
- All `.env` secrets excluded from version control

---

## 📜 License

Academic project — University of Yaoundé · OOADI 2026.

---

<div align="center">

**Built with purpose. Deployed with care.**

🇨🇲 *In an emergency, every second matters.*

</div>