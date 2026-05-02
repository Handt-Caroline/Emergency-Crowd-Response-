// src/models/Institution.js
// BASE CLASS for all institutions (hospital, gendarmerie, fire station)
// Hospital.js will EXTEND this class
class Institution {
constructor(data) {
// Basic identity
this.name = data.name;
this.email = data.email;
// Contact info
this.address = data.address || null;
this.phone = data.phone || null;
// GPS coordinates
this.latitude = data.latitude;
this.longitude = data.longitude;
// Resources — what the institution has
this.equipment = data.equipment || []; // ['OXYGEN', 'DEFIBRILLATOR']
this.personnel = data.personnel || []; // ['CARDIOLOGIST', 'SURGEON']
// Capacity — how many patients they can take
this.totalCapacity = data.totalCapacity || 0;
this.freeCapacity = data.freeCapacity || 0;

// Availability and approval status
this.isAvailable = data.isAvailable ?? true;
this.status = data.status || 'pending';
}
// ■■ Check if this institution has ALL required equipment ■■
// Returns true only if every piece of equipment is present
hasAllEquipment(requiredEquipment) {
return requiredEquipment.every(eq => this.equipment.includes(eq));
}
// Check if this institution has AT LEAST ONE required person 
// Even one matching doctor/nurse is enough
hasAnyPersonnel(requiredPersonnel) {
return requiredPersonnel.some(p => this.personnel.includes(p));
}
//  CORE CHECK — used by dispatch engine 
// Returns true only if institution can handle this emergency
isCapableOf(requirements) {
return (
this.status === 'approved' &&
this.isAvailable === true &&
this.freeCapacity > 0 &&
this.hasAllEquipment(requirements.requiredEquipment) &&
this.hasAnyPersonnel(requirements.requiredPersonnel)
);
}
// ■■ Update capacity when a patient arrives or leaves ■■
// change = -1 when patient arrives, +1 when patient leaves
updateCapacity(change) {
this.freeCapacity += change;
if (this.freeCapacity < 0) this.freeCapacity = 0;
if (this.freeCapacity > this.totalCapacity) {
this.freeCapacity = this.totalCapacity;
}
}
}
module.exports = Institution;