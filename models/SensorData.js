const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  waterLevel: { type: Number, required: true }, // Tính theo %
  temperature: { type: Number, required: true }, // Celsius
  pumpState: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
