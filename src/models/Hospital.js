
const Institution = require('./Institution'); // import base class
class Hospital extends Institution {
constructor(data) {

super(data);

this.icuBeds = data.icuBeds || 0;
this.freeICUBeds = data.freeICUBeds || 0;
this.hasOperatingTheatre = data.hasOperatingTheatre || false;
this.paymentPolicy = data.paymentPolicy || 'deposit_required';
}

isCapableOf(requirements) {

const baseCheck = super.isCapableOf(requirements);
if (!baseCheck) return false; 

if (requirements.needsICU && this.freeICUBeds <= 0) {
return false;
}
return true; // passed all checks
}
}
module.exports = Hospital;