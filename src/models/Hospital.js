// src/models/Hospital.js
// Hospital EXTENDS Institution
// Adds hospital-specific properties and overrides isCapableOf()
const Institution = require('./Institution'); // import base class
class Hospital extends Institution {
constructor(data) {
// super() MUST be first — calls Institution constructor
// This sets up name, email, equipment, personnel, etc.
super(data);
// Hospital-specific properties (not in Institution)
this.icuBeds = data.icuBeds || 0;
this.freeICUBeds = data.freeICUBeds || 0;
this.hasOperatingTheatre = data.hasOperatingTheatre || false;
this.paymentPolicy = data.paymentPolicy || 'deposit_required';
}
// Override isCapableOf() from Institution 
// Adds ICU bed check on top of everything Institution already checks
isCapableOf(requirements) {
// First run the base class check (equipment, personnel, status, capacity)
const baseCheck = super.isCapableOf(requirements);
if (!baseCheck) return false; // failed base check — no need to continue
// If this emergency needs ICU, check we have free ICU beds
if (requirements.needsICU && this.freeICUBeds <= 0) {
return false;
}
return true; // passed all checks
}
}
module.exports = Hospital;