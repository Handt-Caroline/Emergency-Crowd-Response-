
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

this.equipment = data.equipment || []; // ['OXYGEN', 'DEFIBRILLATOR']
this.personnel = data.personnel || []; // ['CARDIOLOGIST', 'SURGEON']
// Capacity — how many patients they can take
this.totalCapacity = data.totalCapacity || 0;
this.freeCapacity = data.freeCapacity || 0;

// Availability and approval status
this.isAvailable = data.isAvailable ?? true;
this.status = data.status || 'pending';
}

hasAllEquipment(requiredEquipment) {
return requiredEquipment.every(eq => this.equipment.includes(eq));
}

hasAnyPersonnel(requiredPersonnel) {
return requiredPersonnel.some(p => this.personnel.includes(p));
}

isCapableOf(requirements) {
return (
this.status === 'approved' &&
this.isAvailable === true &&
this.freeCapacity > 0 &&
this.hasAllEquipment(requirements.requiredEquipment) &&
this.hasAnyPersonnel(requirements.requiredPersonnel)
);
}

updateCapacity(change) {
this.freeCapacity += change;
if (this.freeCapacity < 0) this.freeCapacity = 0;
if (this.freeCapacity > this.totalCapacity) {
this.freeCapacity = this.totalCapacity;
}
}
}
module.exports = Institution;