const HelpCenter = require('../models/HelpCenter');
const Employee = require('../models/Employee');
const { validationResult } = require('express-validator');

// @desc    Create a new help ticket
// @route   POST /api/help-center
// @access  Private (Employee)
const createTicket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject, message, priority, category } = req.body;

    // Find employee by user ID
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee profile not found'
      });
    }

    const ticket = new HelpCenter({
      employee: employee._id,
      subject,
      message,
      priority: priority || 'medium',
      category: category || 'general'
    });

    await ticket.save();
    await ticket.populate('employee', 'name employeeId email');

    res.status(201).json({
      success: true,
      message: 'Help ticket created successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create help ticket'
    });
  }
};

// @desc    Get all tickets (Admin) or employee's tickets (Employee)
// @route   GET /api/help-center
// @access  Private
const getTickets = async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    let tickets;

    if (req.user.role === 'admin') {
      // Admin can see all tickets
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (category) query.category = category;

      tickets = await HelpCenter.find(query)
        .populate('employee', 'name employeeId email')
        .populate('adminReply.repliedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } else {
      // Employee can only see their own tickets
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee profile not found'
        });
      }

      query.employee = employee._id;
      if (status) query.status = status;

      tickets = await HelpCenter.find(query)
        .populate('adminReply.repliedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await HelpCenter.countDocuments(query);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help tickets'
    });
  }
};

// @desc    Get single ticket
// @route   GET /api/help-center/:id
// @access  Private
const getTicket = async (req, res) => {
  try {
    let ticket = await HelpCenter.findById(req.params.id)
      .populate('employee', 'name employeeId email')
      .populate('adminReply.repliedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Help ticket not found'
      });
    }

    // Check if employee can access this ticket
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || ticket.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    // Mark as read if admin is viewing
    if (req.user.role === 'admin' && !ticket.isRead) {
      await ticket.markAsRead();
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help ticket'
    });
  }
};

// @desc    Reply to a ticket (Admin only)
// @route   PUT /api/help-center/:id/reply
// @access  Private (Admin)
const replyToTicket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { message } = req.body;

    const ticket = await HelpCenter.findById(req.params.id)
      .populate('employee', 'name employeeId email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Help ticket not found'
      });
    }

    await ticket.addAdminReply(message, req.user.id);
    await ticket.populate('adminReply.repliedBy', 'name email');

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reply to help ticket'
    });
  }
};

// @desc    Update ticket status (Admin only)
// @route   PUT /api/help-center/:id/status
// @access  Private (Admin)
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const ticket = await HelpCenter.findById(req.params.id)
      .populate('employee', 'name employeeId email')
      .populate('adminReply.repliedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Help ticket not found'
      });
    }

    ticket.status = status;
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket status'
    });
  }
};

// @desc    Delete ticket (Admin only)
// @route   DELETE /api/help-center/:id
// @access  Private (Admin)
const deleteTicket = async (req, res) => {
  try {
    const ticket = await HelpCenter.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Help ticket not found'
      });
    }

    await HelpCenter.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Help ticket deleted successfully'
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete help ticket'
    });
  }
};

// @desc    Get help center statistics (Admin only)
// @route   GET /api/help-center/stats
// @access  Private (Admin)
const getHelpCenterStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      HelpCenter.countDocuments({ status: 'open' }),
      HelpCenter.countDocuments({ status: 'in-progress' }),
      HelpCenter.countDocuments({ status: 'resolved' }),
      HelpCenter.countDocuments({ status: 'closed' }),
      HelpCenter.countDocuments({ priority: 'urgent' }),
      HelpCenter.countDocuments({ priority: 'high' }),
      HelpCenter.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        openTickets: stats[0],
        inProgressTickets: stats[1],
        resolvedTickets: stats[2],
        closedTickets: stats[3],
        urgentTickets: stats[4],
        highPriorityTickets: stats[5],
        totalTickets: stats[6]
      }
    });
  } catch (error) {
    console.error('Get help center stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help center statistics'
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  deleteTicket,
  getHelpCenterStats
};
