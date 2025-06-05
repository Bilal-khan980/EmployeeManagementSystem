const mongoose = require('mongoose');

const helpCenterSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'hr', 'payroll', 'general', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  adminReply: {
    message: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: {
      type: Date
    }
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
helpCenterSchema.index({ employee: 1, status: 1 });
helpCenterSchema.index({ status: 1, createdAt: -1 });
helpCenterSchema.index({ priority: 1, status: 1 });

// Virtual for formatted creation date
helpCenterSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for formatted reply date
helpCenterSchema.virtual('formattedRepliedAt').get(function() {
  if (this.adminReply && this.adminReply.repliedAt) {
    return this.adminReply.repliedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return null;
});

// Method to mark as read
helpCenterSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to add admin reply
helpCenterSchema.methods.addAdminReply = function(message, adminId) {
  this.adminReply = {
    message: message,
    repliedBy: adminId,
    repliedAt: new Date()
  };
  this.status = 'in-progress';
  return this.save();
};

// Method to close ticket
helpCenterSchema.methods.closeTicket = function() {
  this.status = 'closed';
  return this.save();
};

// Static method to get tickets by status
helpCenterSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('employee', 'name employeeId email')
    .populate('adminReply.repliedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get employee tickets
helpCenterSchema.statics.getEmployeeTickets = function(employeeId) {
  return this.find({ employee: employeeId })
    .populate('adminReply.repliedBy', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('HelpCenter', helpCenterSchema);
