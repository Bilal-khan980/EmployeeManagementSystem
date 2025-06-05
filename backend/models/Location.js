const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  latitude: {
    type: Number,
    required: [true, 'Please add latitude']
  },
  longitude: {
    type: Number,
    required: [true, 'Please add longitude']
  },
  address: {
    type: String
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkOutTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  },
  device: {
    type: String
  },
  ipAddress: {
    type: String
  },
  accuracy: {
    type: Number,
    description: 'GPS accuracy in meters'
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    description: 'Last time location was updated (for live tracking)'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Location', LocationSchema);
