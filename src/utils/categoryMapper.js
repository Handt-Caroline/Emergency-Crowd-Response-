

const SITUATION_REQUIREMENTS = {


  UNCONSCIOUS: {  // "Person collapsed"
    medicalCategory: 'RESUSCITATION',
    requiredEquipment: ['DEFIBRILLATOR', 'OXYGEN', 'ICU_BEDS'],
    requiredPersonnel: ['RESUSCITATION_NURSE', 'ANAESTHESIOLOGIST', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: ['Resuscitation team to emergency bay', 'Defibrillator ready', 'Oxygen connected', 'ICU bed reserved'],
      fr: ['Equipe reanimation en salle urgence', 'Defibrillateur pret', 'Oxygene connecte', 'Lit USI reserve']
    }
  },

  NOT_BREATHING: {
    medicalCategory: 'RESUSCITATION',
    requiredEquipment: ['OXYGEN', 'VENTILATOR', 'ICU_BEDS'],
    requiredPersonnel: ['ANAESTHESIOLOGIST', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: ['Ventilator ready', 'Airway management team on standby'],
      fr: ['Ventilateur pret', 'Equipe gestion voies aeriennes disponible']
    }
  },

  CHEST_PAIN: {
    medicalCategory: 'CARDIOLOGY',
    requiredEquipment: ['ECG_MACHINE', 'DEFIBRILLATOR'],
    requiredPersonnel: ['CARDIOLOGIST', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['ECG machine ready', 'Cardiologist on standby', 'Cardiac ward bed reserved'],
      fr: ['ECG pret', 'Cardiologue disponible', 'Lit cardiologie reserve']
    }
  },

  SEVERE_BLEEDING: {
    medicalCategory: 'TRAUMA_SURGERY',
    requiredEquipment: ['OPERATING_THEATRE', 'BLOOD_BANK'],
    requiredPersonnel: ['SURGEON', 'ANAESTHESIOLOGIST'],
    needsICU: false,
    suggestedPrep: {
      en: ['Operating theatre prepared', 'Blood bank alerted', 'Surgeon on standby'],
      fr: ['Bloc operatoire prepare', 'Banque de sang alertee', 'Chirurgien disponible']
    }
  },

  ACCIDENT_TRAUMA: {
    medicalCategory: 'TRAUMA_SURGERY',
    requiredEquipment: ['OPERATING_THEATRE', 'XRAY', 'BLOOD_BANK'],
    requiredPersonnel: ['SURGEON', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Trauma bay ready', 'X-ray available', 'Surgeon on standby'],
      fr: ['Salle trauma prete', 'Radiologie disponible', 'Chirurgien disponible']
    }
  },

  BURN: {
    medicalCategory: 'BURNS_UNIT',
    requiredEquipment: ['BURNS_UNIT', 'OXYGEN'],
    requiredPersonnel: ['BURNS_SPECIALIST', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Burns unit ready', 'Sterile dressings prepared', 'Oxygen available'],
      fr: ['Unite brulures prete', 'Pansements steriles prepares', 'Oxygene disponible']
    }
  },

 
  FACE_DROOPING: {
    medicalCategory: 'NEUROLOGY',
    requiredEquipment: ['CT_SCAN', 'OXYGEN', 'ICU_BEDS'],
    requiredPersonnel: ['NEUROLOGIST', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: ['CT scan available', 'Neurology team on standby', 'Stroke protocol activated'],
      fr: ['Scanner disponible', 'Equipe neurologie disponible', 'Protocole AVC active']
    }
  },

  SLURRED_SPEECH: {
    medicalCategory: 'NEUROLOGY',
    requiredEquipment: ['CT_SCAN', 'OXYGEN', 'ICU_BEDS'],
    requiredPersonnel: ['NEUROLOGIST', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: ['CT scan available', 'Neurology team on standby', 'Stroke protocol activated'],
      fr: ['Scanner disponible', 'Equipe neurologie disponible', 'Protocole AVC active']
    }
  },

  SEIZURE: {  // "Body shaking"
    medicalCategory: 'NEUROLOGY',
    requiredEquipment: ['OXYGEN', 'ICU_BEDS'],
    requiredPersonnel: ['NEUROLOGIST', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Padded bed ready', 'Anti-convulsant medication prepared'],
      fr: ['Lit protege pret', 'Medicaments anticonvulsivants prepares']
    }
  },

  COLD_SWEAT: {  // "Cold sweat / Pale" — sign of shock
    medicalCategory: 'EMERGENCY_MEDICINE',
    requiredEquipment: ['ECG_MACHINE', 'OXYGEN', 'EMERGENCY_BAY'],
    requiredPersonnel: ['CARDIOLOGIST', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['ECG ready', 'Vital signs monitor on', 'IV fluids prepared'],
      fr: ['ECG pret', 'Moniteur signes vitaux', 'Perfusion preparee']
    }
  },

  CHILD_EMERGENCY: {  // "Child unconscious"
    medicalCategory: 'PAEDIATRICS',
    requiredEquipment: ['PAEDIATRIC_WARD', 'OXYGEN'],
    requiredPersonnel: ['PAEDIATRICIAN', 'GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Paediatric bay ready', 'Paediatrician on standby'],
      fr: ['Salle pediatrique prete', 'Pediatre disponible']
    }
  },

  CHILDBIRTH: {
    medicalCategory: 'MATERNITY',
    requiredEquipment: ['MATERNITY_WARD', 'OXYGEN'],
    requiredPersonnel: ['MIDWIFE', 'OBSTETRICIAN'],
    needsICU: false,
    suggestedPrep: {
      en: ['Delivery room prepared', 'Midwife on standby', 'Neonatal kit ready'],
      fr: ['Salle accouchement prete', 'Sage-femme disponible', 'Kit neonatal pret']
    }
  },

  BREATHING_DIFFICULTY: {  // "Trouble breathing" — covers asthma, allergic, etc.
    medicalCategory: 'EMERGENCY_MEDICINE',
    requiredEquipment: ['OXYGEN', 'EMERGENCY_BAY'],  // NEBULIZER removed (not in any hospital; oxygen+bay handles it)
    requiredPersonnel: ['GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Oxygen ready', 'Nebulizer prepared', 'Bronchodilator stocked'],
      fr: ['Oxygene pret', 'Nebuliseur prepare', 'Bronchodilatateur disponible']
    }
  },

  VOMITING_BLOOD: {
    medicalCategory: 'EMERGENCY_MEDICINE',
    requiredEquipment: ['OPERATING_THEATRE', 'BLOOD_BANK', 'EMERGENCY_BAY'],
    requiredPersonnel: ['SURGEON', 'GENERAL_DOCTOR'],
    needsICU: true,
    suggestedPrep: {
      en: ['Surgical team alerted', 'Blood bank ready', 'IV access prepared'],
      fr: ['Equipe chirurgicale alertee', 'Banque de sang prete', 'Acces IV prepare']
    }
  },

 
  FIRE_BUILDING: {
    medicalCategory: 'EMERGENCY_MEDICINE',
    requiredEquipment: ['OXYGEN', 'BURNS_UNIT', 'EMERGENCY_BAY'],
    requiredPersonnel: ['GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Smoke inhalation team', 'Burns unit ready'],
      fr: ['Equipe inhalation fumee', 'Unite brulures prete']
    }
  },

  GAS_LEAK: {
    medicalCategory: 'EMERGENCY_MEDICINE',
    requiredEquipment: ['OXYGEN', 'EMERGENCY_BAY'],
    requiredPersonnel: ['GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Hyperbaric oxygen if available', 'Decontamination protocol'],
      fr: ['Oxygene hyperbare si disponible', 'Protocole decontamination']
    }
  },


  OTHER: {
    medicalCategory: 'GENERAL_MEDICINE',
    requiredEquipment: ['OXYGEN', 'EMERGENCY_BAY'],
    requiredPersonnel: ['GENERAL_DOCTOR'],
    needsICU: false,
    suggestedPrep: {
      en: ['Emergency bay ready', 'General doctor on standby'],
      fr: ['Salle urgence prete', 'Medecin generaliste disponible']
    }
  }
};




const KEYWORD_RULES = [
  {
    keywords: ['blood', 'sang', 'bleeding', 'saigne', 'hemorr', 'haemorr', 'wound', 'blessure'],
    addEquipment: ['BLOOD_BANK', 'OPERATING_THEATRE'],
    addPersonnel: ['SURGEON'],
    note: 'Trauma/bleeding keywords detected'
  },
  {
    keywords: ['chest', 'poitrine', 'heart', 'coeur', 'cœur', 'cardiac', 'cardiaque'],
    addEquipment: ['ECG_MACHINE', 'DEFIBRILLATOR'],
    addPersonnel: ['CARDIOLOGIST'],
    note: 'Cardiac keywords detected'
  },
  {
    keywords: ['breath', 'respir', 'breathing', 'etouffe', 'suffoque', 'asthma', 'asthme'],
    addEquipment: ['OXYGEN'],
    addPersonnel: [],
    note: 'Respiratory keywords detected'
  },
  {
    keywords: ['head', 'tete', 'tête', 'brain', 'cerveau', 'conscience', 'inconscien', 'avc', 'stroke'],
    addEquipment: ['CT_SCAN'],
    addPersonnel: ['NEUROLOGIST'],
    note: 'Neurological keywords detected'
  },
  {
    keywords: ['child', 'enfant', 'baby', 'bebe', 'bébé', 'kid', 'fils', 'fille'],
    addEquipment: ['PAEDIATRIC_WARD'],
    addPersonnel: ['PAEDIATRICIAN'],
    note: 'Pediatric keywords detected'
  },
  {
    keywords: ['pregnan', 'enceinte', 'accouch', 'labor', 'travail'],
    addEquipment: ['MATERNITY_WARD'],
    addPersonnel: ['OBSTETRICIAN', 'MIDWIFE'],
    note: 'Maternity keywords detected'
  },
  {
    keywords: ['burn', 'brule', 'brûle', 'fire', 'feu', 'flamme'],
    addEquipment: ['BURNS_UNIT'],
    addPersonnel: ['BURNS_SPECIALIST'],
    note: 'Burns keywords detected'
  },
  {
    keywords: ['eye', 'yeux', 'vision', 'oeil', 'œil'],
    addEquipment: [],
    addPersonnel: ['OPHTHALMOLOGIST'],
    note: 'Ophthalmology keywords detected'
  },
  {
    keywords: ['bone', 'os', 'fracture', 'broken', 'casse', 'cassé'],
    addEquipment: ['XRAY'],
    addPersonnel: ['SURGEON'],
    note: 'Orthopedic keywords detected'
  },
];



function getRequirements(situation) {
  return SITUATION_REQUIREMENTS[situation] || SITUATION_REQUIREMENTS['OTHER'];
}

/**
 * Get COMBINED requirements when multiple symptoms are selected.
 * Strategy: UNION of all equipment + UNION of all personnel.
 * needsICU: true if ANY symptom needs ICU.
 *
 * @param {string[]} situations - array of symptom values, e.g. ['CHEST_PAIN', 'COLD_SWEAT']
 * @returns combined requirements object
 */
function getCombinedRequirements(situations) {
  if (!Array.isArray(situations) || situations.length === 0) {
    return SITUATION_REQUIREMENTS['OTHER'];
  }
  if (situations.length === 1) {
    return getRequirements(situations[0]);
  }

  const equipmentSet = new Set();
  const personnelSet = new Set();
  const prepEnSet    = new Set();
  const prepFrSet    = new Set();
  let needsICU       = false;
  const categories   = new Set();

  for (const sit of situations) {
    const req = getRequirements(sit);
    req.requiredEquipment.forEach(e => equipmentSet.add(e));
    req.requiredPersonnel.forEach(p => personnelSet.add(p));
    req.suggestedPrep.en.forEach(s => prepEnSet.add(s));
    req.suggestedPrep.fr.forEach(s => prepFrSet.add(s));
    if (req.needsICU) needsICU = true;
    categories.add(req.medicalCategory);
  }

  return {
    medicalCategory:   categories.size === 1 ? [...categories][0] : 'MULTI_CATEGORY',
    requiredEquipment: [...equipmentSet],
    requiredPersonnel: [...personnelSet],
    needsICU,
    suggestedPrep: {
      en: [...prepEnSet],
      fr: [...prepFrSet]
    }
  };
}

/**
 * Parse free text "Other" description and detect keywords.
 * Returns extra requirements to ADD on top of baseline OTHER.
 *
 * @param {string} description - bystander's free text
 * @returns { addEquipment: [], addPersonnel: [], notes: [] }
 */
function parseOtherDescription(description) {
  if (!description || typeof description !== 'string') {
    return { addEquipment: [], addPersonnel: [], notes: [] };
  }

  const lower = description.toLowerCase();
  const addEquipment = new Set();
  const addPersonnel = new Set();
  const notes = [];

  for (const rule of KEYWORD_RULES) {
    const matched = rule.keywords.some(kw => lower.includes(kw));
    if (matched) {
      rule.addEquipment.forEach(e => addEquipment.add(e));
      rule.addPersonnel.forEach(p => addPersonnel.add(p));
      notes.push(rule.note);
    }
  }

  return {
    addEquipment: [...addEquipment],
    addPersonnel: [...addPersonnel],
    notes
  };
}

/**
 * Get smart requirements for OTHER + free text.
 * Combines OTHER baseline + keyword detection.
 */
function getOtherWithKeywords(description) {
  const baseline = SITUATION_REQUIREMENTS['OTHER'];
  const detected = parseOtherDescription(description);

  const equipment = [...new Set([...baseline.requiredEquipment, ...detected.addEquipment])];
  const personnel = [...new Set([...baseline.requiredPersonnel, ...detected.addPersonnel])];

  return {
    medicalCategory:   detected.notes.length > 0 ? 'KEYWORD_DETECTED' : 'GENERAL_MEDICINE',
    requiredEquipment: equipment,
    requiredPersonnel: personnel,
    needsICU:          false,
    suggestedPrep:     baseline.suggestedPrep,
    detectedNotes:     detected.notes
  };
}

function getSuggestedPrep(situation, lang = 'fr') {
  const req = getRequirements(situation);
  const safeLang = (lang === 'en') ? 'en' : 'fr';
  return req.suggestedPrep[safeLang];
}

module.exports = {
  getRequirements,
  getCombinedRequirements,
  parseOtherDescription,
  getOtherWithKeywords,
  getSuggestedPrep,
  SITUATION_REQUIREMENTS,
  KEYWORD_RULES
};