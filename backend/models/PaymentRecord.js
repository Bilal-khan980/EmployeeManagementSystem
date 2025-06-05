const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  payPeriod: {
    type: String,
    // Format: "Week of MM/DD/YYYY - MM/DD/YYYY"
    // Will be auto-generated in pre-save middleware
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  overtime: {
    hours: {
      type: Number,
      default: 0,
      min: 0
    },
    rate: {
      type: Number,
      default: 0,
      min: 0
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  bonuses: [{
    description: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  deductions: [{
    description: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  grossPay: {
    type: Number,
    min: 0
    // Will be auto-calculated in pre-save middleware
  },
  totalDeductions: {
    type: Number,
    default: 0,
    min: 0
  },
  netPay: {
    type: Number,
    min: 0
    // Will be auto-calculated in pre-save middleware
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'check', 'other'],
    default: 'bank_transfer'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isViewed: {
    type: Boolean,
    default: false
  },
  viewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
paymentRecordSchema.index({ employee: 1, weekStartDate: -1 });
paymentRecordSchema.index({ paymentStatus: 1, weekStartDate: -1 });
paymentRecordSchema.index({ weekStartDate: 1, weekEndDate: 1 });

// Ensure unique payment record per employee per week
paymentRecordSchema.index({ employee: 1, weekStartDate: 1, weekEndDate: 1 }, { unique: true });

// Virtual for formatted pay period
paymentRecordSchema.virtual('formattedPayPeriod').get(function() {
  const startDate = this.weekStartDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
  const endDate = this.weekEndDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
  return `Week of ${startDate} - ${endDate}`;
});

// Virtual for formatted payment date
paymentRecordSchema.virtual('formattedPaymentDate').get(function() {
  if (this.paymentDate) {
    return this.paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  return null;
});

// Virtual for formatted creation date
paymentRecordSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save middleware to calculate totals
paymentRecordSchema.pre('save', function(next) {
  try {
    // Calculate total bonuses
    const totalBonuses = this.bonuses.reduce((sum, bonus) => sum + (bonus.amount || 0), 0);

    // Calculate total deductions
    this.totalDeductions = this.deductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0);

    // Calculate gross pay (basic salary + overtime + bonuses)
    const basicSalary = this.basicSalary || 0;
    const overtimeAmount = (this.overtime && this.overtime.amount) ? this.overtime.amount : 0;
    this.grossPay = basicSalary + overtimeAmount + totalBonuses;

    // Calculate net pay (gross pay - total deductions)
    this.netPay = this.grossPay - this.totalDeductions;

    // Generate pay period string
    if (this.weekStartDate && this.weekEndDate) {
      const startDate = this.weekStartDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      const endDate = this.weekEndDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      this.payPeriod = `Week of ${startDate} - ${endDate}`;
    }

    next();
  } catch (error) {
    console.error('Error in pre-save middleware:', error);
    next(error);
  }
});

// Method to mark as viewed by employee
paymentRecordSchema.methods.markAsViewed = function() {
  this.isViewed = true;
  this.viewedAt = new Date();
  return this.save();
};

// Method to mark as paid
paymentRecordSchema.methods.markAsPaid = function(paymentDate = new Date()) {
  this.paymentStatus = 'paid';
  this.paymentDate = paymentDate;
  return this.save();
};

// Static method to get employee payment records
paymentRecordSchema.statics.getEmployeeRecords = function(employeeId, limit = 10) {
  return this.find({ employee: employeeId })
    .populate('uploadedBy', 'name email')
    .sort({ weekStartDate: -1 })
    .limit(limit);
};

// Static method to get payment records by status
paymentRecordSchema.statics.getByStatus = function(status) {
  return this.find({ paymentStatus: status })
    .populate('employee', 'employeeId')
    .populate({
      path: 'employee',
      populate: {
        path: 'user',
        select: 'name email department position'
      }
    })
    .populate('uploadedBy', 'name email')
    .sort({ weekStartDate: -1 });
};

// Static method to get payment records for a specific week
paymentRecordSchema.statics.getWeekRecords = function(startDate, endDate) {
  return this.find({
    weekStartDate: { $gte: startDate },
    weekEndDate: { $lte: endDate }
  })
    .populate('employee', 'employeeId')
    .populate({
      path: 'employee',
      populate: {
        path: 'user',
        select: 'name email department position'
      }
    })
    .populate('uploadedBy', 'name email')
    .sort({ weekStartDate: -1 });
};

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
