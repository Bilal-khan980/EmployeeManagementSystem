const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  createTicket,
  getTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  deleteTicket,
  getHelpCenterStats
} = require('../controllers/helpCenter');

const { protect, authorize } = require('../middleware/auth');

// Validation rules
const createTicketValidation = [
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('category')
    .optional()
    .isIn(['technical', 'hr', 'payroll', 'general', 'other'])
    .withMessage('Invalid category')
];

const replyValidation = [
  body('message')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Reply message must be between 5 and 2000 characters')
];

// @route   GET /api/help-center/stats
// @desc    Get help center statistics
// @access  Private (Admin only)
router.get('/stats', protect, authorize('admin'), getHelpCenterStats);

// @route   POST /api/help-center
// @desc    Create a new help ticket
// @access  Private (Employee)
router.post('/', protect, createTicketValidation, createTicket);

// @route   GET /api/help-center
// @desc    Get all tickets (Admin) or employee's tickets (Employee)
// @access  Private
router.get('/', protect, getTickets);

// @route   GET /api/help-center/:id
// @desc    Get single ticket
// @access  Private
router.get('/:id', protect, getTicket);

// @route   PUT /api/help-center/:id/reply
// @desc    Reply to a ticket
// @access  Private (Admin only)
router.put('/:id/reply', protect, authorize('admin'), replyValidation, replyToTicket);

// @route   PUT /api/help-center/:id/status
// @desc    Update ticket status
// @access  Private (Admin only)
router.put('/:id/status', protect, authorize('admin'), updateTicketStatus);

// @route   DELETE /api/help-center/:id
// @desc    Delete ticket
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), deleteTicket);

module.exports = router;
