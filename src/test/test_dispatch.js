// src/test/test_dispatch.js

const Hospital = require('../models/Hospital');
const DispatchEngine = require('../services/DispatchEngine');
const categoryMapper = require('../utils/categoryMapper');

// Create test hospitals
const hospitals = [

  new Hospital({
    name: 'Hospital A',
    equipment: ['OXYGEN', 'DEFIBRILLATOR'],
    personnel: ['DOCTOR'],
    freeCapacity: 10,
    status: 'approved'
  }),

  new Hospital({
    name: 'Hospital B',
    equipment: ['OPERATING_THEATRE', 'BLOOD_BANK'],
    personnel: ['SURGEON'],
    freeCapacity: 5,
    status: 'approved'
  })
];

// Choose emergency type
const emergency = categoryMapper.BLEEDING;

// Run dispatch
const engine = new DispatchEngine();

const result = engine.findBestHospital(hospitals, emergency);

// Output result
console.log("Best hospital:", result ? result.name : "None");