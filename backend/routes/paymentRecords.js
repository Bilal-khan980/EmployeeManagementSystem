const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  createPaymentRecord,
  getPaymentRecords,
  getPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  getPaymentStats,
  getMyPaymentSummary
} = require('../controllers/paymentRecords');

const { protect, authorize } = require('../middleware/auth');

// Validation rules
const createPaymentRecordValidation = [
  body('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isMongoId()
    .withMessage('Invalid employee ID'),
  body('weekStartDate')
    .notEmpty()
    .withMessage('Week start date is required')
    .isISO8601()
    .withMessage('Invalid week start date format'),
  body('weekEndDate')
    .notEmpty()
    .withMessage('Week end date is required')
    .isISO8601()
    .withMessage('Invalid week end date format'),
  body('basicSalary')
    .isNumeric()
    .withMessage('Basic salary must be a number')
    .isFloat({ min: 0 })
    .withMessage('Basic salary must be a positive number'),
  body('overtime.hours')
    .optional()
    .isNumeric()
    .withMessage('Overtime hours must be a number')
    .isFloat({ min: 0 })
    .withMessage('Overtime hours must be a positive number'),
  body('overtime.rate')
    .optional()
    .isNumeric()
    .withMessage('Overtime rate must be a number')
    .isFloat({ min: 0 })
    .withMessage('Overtime rate must be a positive number'),
  body('overtime.amount')
    .optional()
    .isNumeric()
    .withMessage('Overtime amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Overtime amount must be a positive number'),
  body('bonuses')
    .optional()
    .isArray()
    .withMessage('Bonuses must be an array'),
  body('bonuses.*.description')
    .optional()
    .notEmpty()
    .withMessage('Bonus description is required'),
  body('bonuses.*.amount')
    .optional()
    .isNumeric()
    .withMessage('Bonus amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Bonus amount must be a positive number'),
  body('deductions')
    .optional()
    .isArray()
    .withMessage('Deductions must be an array'),
  body('deductions.*.description')
    .optional()
    .notEmpty()
    .withMessage('Deduction description is required'),
  body('deductions.*.amount')
    .optional()
    .isNumeric()
    .withMessage('Deduction amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Deduction amount must be a positive number'),
  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'cash', 'check', 'other'])
    .withMessage('Invalid payment method'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const updatePaymentRecordValidation = [
  body('basicSalary')
    .optional()
    .isNumeric()
    .withMessage('Basic salary must be a number')
    .isFloat({ min: 0 })
    .withMessage('Basic salary must be a positive number'),
  body('overtime.hours')
    .optional()
    .isNumeric()
    .withMessage('Overtime hours must be a number')
    .isFloat({ min: 0 })
    .withMessage('Overtime hours must be a positive number'),
  body('overtime.rate')
    .optional()
    .isNumeric()
    .withMessage('Overtime rate must be a number')
    .isFloat({ min: 0 })
    .withMessage('Overtime rate must be a positive number'),
  body('overtime.amount')
    .optional()
    .isNumeric()
    .withMessage('Overtime amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Overtime amount must be a positive number'),
  body('bonuses')
    .optional()
    .isArray()
    .withMessage('Bonuses must be an array'),
  body('bonuses.*.description')
    .optional()
    .notEmpty()
    .withMessage('Bonus description is required'),
  body('bonuses.*.amount')
    .optional()
    .isNumeric()
    .withMessage('Bonus amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Bonus amount must be a positive number'),
  body('deductions')
    .optional()
    .isArray()
    .withMessage('Deductions must be an array'),
  body('deductions.*.description')
    .optional()
    .notEmpty()
    .withMessage('Deduction description is required'),
  body('deductions.*.amount')
    .optional()
    .isNumeric()
    .withMessage('Deduction amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Deduction amount must be a positive number'),
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'cancelled'])
    .withMessage('Invalid payment status'),
  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'cash', 'check', 'other'])
    .withMessage('Invalid payment method'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// @route   GET /api/payment-records/stats
// @desc    Get payment records statistics
// @access  Private (Admin only)
router.get('/stats', protect, authorize('admin'), getPaymentStats);

// @route   GET /api/payment-records/my-summary
// @desc    Get employee's payment summary
// @access  Private (Employee only)
router.get('/my-summary', protect, authorize('employee'), getMyPaymentSummary);

// @route   POST /api/payment-records
// @desc    Create a new payment record
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), createPaymentRecordValidation, createPaymentRecord);

// @route   GET /api/payment-records
// @desc    Get all payment records (Admin) or employee's records (Employee)
// @access  Private
router.get('/', protect, getPaymentRecords);

// @route   GET /api/payment-records/:id
// @desc    Get single payment record
// @access  Private
router.get('/:id', protect, getPaymentRecord);

// @route   PUT /api/payment-records/:id
// @desc    Update payment record
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), updatePaymentRecordValidation, updatePaymentRecord);

// @route   DELETE /api/payment-records/:id
// @desc    Delete payment record
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), deletePaymentRecord);

module.exports = router;
