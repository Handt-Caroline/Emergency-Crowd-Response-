const SITUATION_REQUIREMENTS = {

UNCONSCIOUS: {
medicalCategory: 'RESUSCITATION',
requiredEquipment: ['DEFIBRILLATOR', 'OXYGEN', 'ICU_BEDS'],
requiredPersonnel: ['RESUSCITATION_NURSE', 'ANAESTHESIOLOGIST', 'GENERAL_DOCTOR'],
suggestedPrep: {
en: [
'Resuscitation team to emergency bay',
'Defibrillator powered and ready',
'Oxygen supply connected',
'ICU bed reserved'
],
fr: [
'Equipe de reanimation en salle urgence',
'Defibrillateur pret',
'Oxygene connecte',
'Lit USI reserve'
]
}
},

CHEST_PAIN: {
medicalCategory: 'CARDIOLOGY',
requiredEquipment: ['ECG_MACHINE', 'DEFIBRILLATOR'],
requiredPersonnel: ['CARDIOLOGIST', 'GENERAL_DOCTOR'],
suggestedPrep: {
en: [
'ECG machine ready',
'Cardiologist on standby',
'Cardiac ward bed reserved'
],
fr: [
'ECG pret',
'Cardiologue disponible',
'Lit cardiologie reserve'
]
}
}

};

// FUNCTIONS
function getRequirements(situation) {
return SITUATION_REQUIREMENTS[situation] || SITUATION_REQUIREMENTS['OTHER'];
}

function getSuggestedPrep(situation, lang = 'fr') {
const req = getRequirements(situation);
return req.suggestedPrep[lang] || req.suggestedPrep['fr'];
}

module.exports = {
getRequirements,
getSuggestedPrep,
SITUATION_REQUIREMENTS
};

