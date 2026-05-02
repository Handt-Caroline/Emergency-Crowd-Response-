const SITUATION_REQUIREMENTS = {
  UNCONSCIOUS: {
    medicalCategory: 'RESUSCITATION',
    requiredEquipment: ['DEFIBRILLATOR', 'OXYGEN', 'ICU_BEDS'],
    requiredPersonnel: ['RESUSCITATION_NURSE', 'ANAESTHESIOLOGIST', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: [
        'Resuscitation team to emergency bay',
        'Defibrillator ready',
        'Oxygen connected',
        'ICU bed reserved'
      ],
      fr: [
        'Equipe reanimation en salle urgence',
        'Defibrillateur pret',
        'Oxygene connecte',
        'Lit USI reserve'
      ]
    }
  },

  NOT_BREATHING: {
    medicalCategory: 'RESUSCITATION',
    requiredEquipment: ['OXYGEN', 'VENTILATOR', 'ICU_BEDS'],
    requiredPersonnel: ['ANAESTHESIOLOGIST', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: [
        'Ventilator ready',
        'Airway management team on standby'
      ],
      fr: [
        'Ventilateur pret',
        'Equipe gestion voies aeriennes disponible'
      ]
    }
  },

  CHEST_PAIN: {
    medicalCategory: 'CARDIOLOGY',
    requiredEquipment: ['ECG_MACHINE', 'DEFIBRILLATOR'],
    requiredPersonnel: ['CARDIOLOGIST', 'GENERAL_DOCTOR'],
    needsICU: false,
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
  },

  CARDIAC_ARREST: {
    medicalCategory: 'CARDIOLOGY',
    requiredEquipment: ['DEFIBRILLATOR', 'ECG_MACHINE', 'OXYGEN'],
    requiredPersonnel: ['CARDIOLOGIST', 'RESUSCITATION_NURSE'],
    needsICU: true,
    suggestedPrep: {
      en: [
        'Defibrillator powered and ready',
        'Cardiac team assembled',
        'ICU bed reserved'
      ],
      fr: [
        'Defibrillateur sous tension',
        'Equipe cardiaque reunite',
        'Lit USI reserve'
      ]
    }
  },

  SEVERE_BLEEDING: {
    medicalCategory: 'TRAUMA_SURGERY',
    requiredEquipment: ['OPERATING_THEATRE', 'BLOOD_BANK'],
    requiredPersonnel: ['SURGEON', 'ANAESTHESIOLOGIST'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Operating theatre prepared',
        'Blood bank alerted',
        'Surgeon on standby'
      ],
      fr: [
        'Bloc operatoire prepare',
        'Banque de sang alertee',
        'Chirurgien disponible'
      ]
    }
  },

  ACCIDENT_TRAUMA: {
    medicalCategory: 'TRAUMA_SURGERY',
    requiredEquipment: ['OPERATING_THEATRE', 'XRAY', 'BLOOD_BANK'],
    requiredPersonnel: ['SURGEON', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Trauma bay ready',
        'X-ray available',
        'Surgeon on standby'
      ],
      fr: [
        'Salle trauma prete',
        'Radiologie disponible',
        'Chirurgien disponible'
      ]
    }
  },

  BURN: {
    medicalCategory: 'BURNS_UNIT',
    requiredEquipment: ['BURNS_UNIT', 'OXYGEN'],
    requiredPersonnel: ['BURNS_SPECIALIST', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Burns unit ready',
        'Sterile dressings prepared',
        'Oxygen available'
      ],
      fr: [
        'Unite brulures prete',
        'Pansements steriles prepares',
        'Oxygene disponible'
      ]
    }
  },

  STROKE: {
    medicalCategory: 'NEUROLOGY',
    requiredEquipment: ['CT_SCAN', 'OXYGEN', 'ICU_BEDS'],
    requiredPersonnel: ['NEUROLOGIST', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: [
        'CT scan available',
        'Neurology team on standby',
        'ICU bed reserved'
      ],
      fr: [
        'Scanner disponible',
        'Equipe neurologie disponible',
        'Lit USI reserve'
      ]
    }
  },

  SEIZURE: {
    medicalCategory: 'NEUROLOGY',
    requiredEquipment: ['OXYGEN', 'ICU_BEDS'],
    requiredPersonnel: ['NEUROLOGIST', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Padded bed ready',
        'Anti-convulsant medication prepared'
      ],
      fr: [
        'Lit protege pret',
        'Medicaments anticonvulsivants prepares'
      ]
    }
  },

  CHILD_EMERGENCY: {
    medicalCategory: 'PAEDIATRICS',
    requiredEquipment: ['PAEDIATRIC_WARD', 'OXYGEN'],
    requiredPersonnel: ['PAEDIATRICIAN', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Paediatric bay ready',
        'Paediatrician on standby'
      ],
      fr: [
        'Salle pediatrique prete',
        'Pediatre disponible'
      ]
    }
  },

  CHILDBIRTH: {
    medicalCategory: 'MATERNITY',
    requiredEquipment: ['MATERNITY_WARD', 'OXYGEN'],
    requiredPersonnel: ['MIDWIFE', 'OBSTETRICIAN'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Delivery room prepared',
        'Midwife on standby',
        'Neonatal kit ready'
      ],
      fr: [
        'Salle accouchement prete',
        'Sage-femme disponible',
        'Kit neonatal pret'
      ]
    }
  },

  ALLERGIC_REACTION: {
    medicalCategory: 'GENERAL_MEDICINE',
    requiredEquipment: ['OXYGEN', 'EMERGENCY_BAY'],
    requiredPersonnel: ['GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Adrenaline/epinephrine prepared',
        'Emergency bay ready'
      ],
      fr: [
        'Adrenaline preparee',
        'Salle urgence prete'
      ]
    }
  },

  OTHER: {
    medicalCategory: 'GENERAL_MEDICINE',
    requiredEquipment: ['OXYGEN', 'EMERGENCY_BAY'],
    requiredPersonnel: ['GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: [
        'Emergency bay ready',
        'General doctor on standby'
      ],
      fr: [
        'Salle urgence prete',
        'Medecin generaliste disponible'
      ]
    }
  }
};

function getRequirements(situation) {
  return SITUATION_REQUIREMENTS[situation] || SITUATION_REQUIREMENTS['OTHER'];
}

function getSuggestedPrep(situation, lang = 'fr') {
  const req = getRequirements(situation);
  const safeLang = (lang === 'en') ? 'en' : 'fr';
  return req.suggestedPrep[safeLang];
}

module.exports = { getRequirements, getSuggestedPrep, SITUATION_REQUIREMENTS };