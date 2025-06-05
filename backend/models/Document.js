const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a document name'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please specify document type'],
    enum: ['ID', 'Certificate', 'Contract', 'Resume', 'Other']
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide file URL']
  },
  fileType: {
    type: String,
    required: [true, 'Please provide file type']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
