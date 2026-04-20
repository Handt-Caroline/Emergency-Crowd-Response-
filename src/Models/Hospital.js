// src/models/Institution.js

// Base class for ALL institutions (hospital, police, etc.)
class Institution {

  constructor(data) {

    // Basic identity
    this.name = data.name;
    this.email = data.email;

    // Contact info
    this.address = data.address;
    this.phone = data.phone;

    // GPS coordinates
    this.latitude = data.latitude;
    this.longitude = data.longitude;

    // Resources
    this.equipment = data.equipment || [];   // e.g. ['OXYGEN','XRAY']
    this.personnel = data.personnel || [];   // e.g. ['DOCTOR','SURGEON']

    // Capacity
    this.freeCapacity = data.freeCapacity || 0;

    // Availability & status
    this.isAvailable = data.isAvailable ?? true;
    this.status = data.status || 'pending';
  }

  // Check if ALL required equipment exists
  hasAllEquipment(requiredEquipment) {
    return requiredEquipment.every(eq => this.equipment.includes(eq));
  }

  // Check if at least ONE required personnel exists
  hasAnyPersonnel(requiredPersonnel) {
    return requiredPersonnel.some(p => this.personnel.includes(p));
  }

  // 🔥 CORE METHOD — used by dispatch engine
  isCapableOf(requirements) {

    return (
      this.status === 'approved' &&          // must be approved
      this.isAvailable === true &&           // must be available
      this.freeCapacity > 0 &&               // must have space
      this.hasAllEquipment(requirements.equipment) &&
      this.hasAnyPersonnel(requirements.personnel)
    );
  }

  // Update capacity (when patient comes or leaves)
  updateCapacity(change) {
    this.freeCapacity += change;

    if (this.freeCapacity < 0) {
      this.freeCapacity = 0;
    }
  }
}

module.exports = Institution;