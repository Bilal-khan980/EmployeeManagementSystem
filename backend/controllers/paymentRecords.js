const PaymentRecord = require('../models/PaymentRecord');
const Employee = require('../models/Employee');
const { validationResult } = require('express-validator');

// @desc    Create a new payment record
// @route   POST /api/payment-records
// @access  Private (Admin only)
const createPaymentRecord = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      employeeId,
      weekStartDate,
      weekEndDate,
      basicSalary,
      overtime,
      bonuses,
      deductions,
      paymentMethod,
      notes
    } = req.body;

    // Find employee by ID
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Check if payment record already exists for this employee and week
    const existingRecord = await PaymentRecord.findOne({
      employee: employeeId,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate)
    });

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: 'Payment record already exists for this employee and week period'
      });
    }

    // Process overtime data
    const processedOvertime = overtime || { hours: 0, rate: 0, amount: 0 };
    if (processedOvertime.hours && processedOvertime.rate) {
      processedOvertime.amount = processedOvertime.hours * processedOvertime.rate;
    }

    // Process bonuses and deductions
    const processedBonuses = bonuses || [];
    const processedDeductions = deductions || [];

    // Create payment record
    const paymentRecord = new PaymentRecord({
      employee: employeeId,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      basicSalary: parseFloat(basicSalary),
      overtime: processedOvertime,
      bonuses: processedBonuses,
      deductions: processedDeductions,
      paymentMethod: paymentMethod || 'bank_transfer',
      notes,
      uploadedBy: req.user.id
    });

    await paymentRecord.save();
    await paymentRecord.populate([
      {
        path: 'employee',
        select: 'employeeId',
        populate: {
          path: 'user',
          select: 'name email department position'
        }
      },
      {
        path: 'uploadedBy',
        select: 'name email'
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully',
      data: paymentRecord
    });
  } catch (error) {
    console.error('Create payment record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment record'
    });
  }
};

// @desc    Get all payment records (Admin) or employee's records (Employee)
// @route   GET /api/payment-records
// @access  Private
const getPaymentRecords = async (req, res) => {
  try {
    const { status, employeeId, page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    let paymentRecords;

    if (req.user.role === 'admin') {
      // Admin can see all payment records
      if (status) query.paymentStatus = status;
      if (employeeId) query.employee = employeeId;
      if (startDate && endDate) {
        query.weekStartDate = { $gte: new Date(startDate) };
        query.weekEndDate = { $lte: new Date(endDate) };
      }

      paymentRecords = await PaymentRecord.find(query)
        .populate({
          path: 'employee',
          select: 'employeeId',
          populate: {
            path: 'user',
            select: 'name email department position'
          }
        })
        .populate('uploadedBy', 'name email')
        .sort({ weekStartDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } else {
      // Employee can only see their own payment records
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee profile not found'
        });
      }

      query.employee = employee._id;
      if (status) query.paymentStatus = status;

      paymentRecords = await PaymentRecord.find(query)
        .populate('uploadedBy', 'name email')
        .sort({ weekStartDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await PaymentRecord.countDocuments(query);

    res.json({
      success: true,
      data: paymentRecords,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get payment records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment records'
    });
  }
};

// @desc    Get single payment record
// @route   GET /api/payment-records/:id
// @access  Private
const getPaymentRecord = async (req, res) => {
  try {
    let paymentRecord = await PaymentRecord.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'employeeId',
        populate: {
          path: 'user',
          select: 'name email department position'
        }
      })
      .populate('uploadedBy', 'name email');

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    // Check if employee can access this payment record
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || paymentRecord.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Mark as viewed if employee is viewing
      if (!paymentRecord.isViewed) {
        await paymentRecord.markAsViewed();
      }
    }

    res.json({
      success: true,
      data: paymentRecord
    });
  } catch (error) {
    console.error('Get payment record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment record'
    });
  }
};

// @desc    Update payment record
// @route   PUT /api/payment-records/:id
// @access  Private (Admin only)
const updatePaymentRecord = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const paymentRecord = await PaymentRecord.findById(req.params.id);

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    // Update fields with proper processing
    if (req.body.basicSalary !== undefined) {
      paymentRecord.basicSalary = parseFloat(req.body.basicSalary);
    }

    if (req.body.overtime !== undefined) {
      const overtime = req.body.overtime;
      if (overtime.hours && overtime.rate) {
        overtime.amount = overtime.hours * overtime.rate;
      }
      paymentRecord.overtime = overtime;
    }

    if (req.body.bonuses !== undefined) {
      paymentRecord.bonuses = req.body.bonuses;
    }

    if (req.body.deductions !== undefined) {
      paymentRecord.deductions = req.body.deductions;
    }

    if (req.body.paymentStatus !== undefined) {
      paymentRecord.paymentStatus = req.body.paymentStatus;
    }

    if (req.body.paymentMethod !== undefined) {
      paymentRecord.paymentMethod = req.body.paymentMethod;
    }

    if (req.body.notes !== undefined) {
      paymentRecord.notes = req.body.notes;
    }

    // Set payment date if status is being changed to paid
    if (req.body.paymentStatus === 'paid' && paymentRecord.paymentStatus !== 'paid') {
      paymentRecord.paymentDate = new Date();
    }

    await paymentRecord.save();
    await paymentRecord.populate([
      {
        path: 'employee',
        select: 'employeeId',
        populate: {
          path: 'user',
          select: 'name email department position'
        }
      },
      {
        path: 'uploadedBy',
        select: 'name email'
      }
    ]);

    res.json({
      success: true,
      message: 'Payment record updated successfully',
      data: paymentRecord
    });
  } catch (error) {
    console.error('Update payment record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment record'
    });
  }
};

// @desc    Delete payment record
// @route   DELETE /api/payment-records/:id
// @access  Private (Admin only)
const deletePaymentRecord = async (req, res) => {
  try {
    const paymentRecord = await PaymentRecord.findById(req.params.id);

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    await PaymentRecord.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Payment record deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment record'
    });
  }
};

// @desc    Get payment records statistics (Admin only)
// @route   GET /api/payment-records/stats
// @access  Private (Admin only)
const getPaymentStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      PaymentRecord.countDocuments({ paymentStatus: 'pending' }),
      PaymentRecord.countDocuments({ paymentStatus: 'paid' }),
      PaymentRecord.countDocuments({ paymentStatus: 'cancelled' }),
      PaymentRecord.countDocuments(),
      PaymentRecord.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalPaid: { $sum: '$netPay' } } }
      ]),
      PaymentRecord.aggregate([
        { $match: { paymentStatus: 'pending' } },
        { $group: { _id: null, totalPending: { $sum: '$netPay' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        pendingRecords: stats[0],
        paidRecords: stats[1],
        cancelledRecords: stats[2],
        totalRecords: stats[3],
        totalPaidAmount: stats[4][0]?.totalPaid || 0,
        totalPendingAmount: stats[5][0]?.totalPending || 0
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics'
    });
  }
};

// @desc    Get employee's payment summary
// @route   GET /api/payment-records/my-summary
// @access  Private (Employee only)
const getMyPaymentSummary = async (req, res) => {
  try {
    // Find employee record for the logged-in user
    const employee = await Employee.findOne({ user: req.user.id })
      .populate('user', 'name email department position');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee record not found'
      });
    }

    // Get payment statistics for this employee
    const stats = await Promise.all([
      PaymentRecord.countDocuments({ employee: employee._id, paymentStatus: 'pending' }),
      PaymentRecord.countDocuments({ employee: employee._id, paymentStatus: 'paid' }),
      PaymentRecord.countDocuments({ employee: employee._id, paymentStatus: 'cancelled' }),
      PaymentRecord.countDocuments({ employee: employee._id }),
      PaymentRecord.aggregate([
        { $match: { employee: employee._id, paymentStatus: 'paid' } },
        { $group: { _id: null, totalPaid: { $sum: '$netPay' } } }
      ]),
      PaymentRecord.aggregate([
        { $match: { employee: employee._id, paymentStatus: 'pending' } },
        { $group: { _id: null, totalPending: { $sum: '$netPay' } } }
      ]),
      PaymentRecord.findOne({ employee: employee._id }).sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: employee.user.name,
          email: employee.user.email,
          department: employee.user.department,
          position: employee.user.position
        },
        summary: {
          pendingPayments: stats[0],
          paidPayments: stats[1],
          cancelledPayments: stats[2],
          totalPayments: stats[3],
          totalPaidAmount: stats[4][0]?.totalPaid || 0,
          totalPendingAmount: stats[5][0]?.totalPending || 0,
          lastPayment: stats[6]
        }
      }
    });
  } catch (error) {
    console.error('Get employee payment summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment summary'
    });
  }
};

module.exports = {
  createPaymentRecord,
  getPaymentRecords,
  getPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  getPaymentStats,
  getMyPaymentSummary
};
