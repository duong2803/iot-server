const mongoose = require('mongoose');

// Định nghĩa schema cho logs
const logSchema = new mongoose.Schema({
  waterLevel: {
    type: Number,
    required: true
  },
  pumpStatus: {
    type: String,
    enum: ['on', 'off'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Tạo model từ schema
const Logs = mongoose.model('Logs', logSchema);

module.exports = Logs;