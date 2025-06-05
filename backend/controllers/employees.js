const User = require('../models/User');
const Employee = require('../models/Employee');
const { validationResult } = require('express-validator');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private/Admin
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate({
        path: 'user',
        select: 'name email department position phoneNumber address joiningDate role',
        match: { role: 'employee' } // Only include users with employee role
      });

    // Filter out any employees where user is null (admin users)
    const filteredEmployees = employees.filter(emp => emp.user !== null);

    res.status(200).json({
      success: true,
      count: filteredEmployees.length,
      data: filteredEmployees
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate({
        path: 'user',
        select: 'name email department position phoneNumber address joiningDate'
      })
      .populate('documents')
      .populate('locations');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Make sure user is employee owner or admin
    if (
      req.user.role !== 'admin' &&
      employee.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this employee'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private/Admin
exports.createEmployee = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, department, position, phoneNumber, address } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Create user with employee role
    user = await User.create({
      name,
      email,
      password,
      role: 'employee',
      department,
      position,
      phoneNumber,
      address
    });

    // Create employee record
    const employeeId = `EMP${Date.now().toString().slice(-6)}`;
    const employee = await Employee.create({
      user: user._id,
      employeeId,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private/Admin
exports.updateEmployee = async (req, res) => {
  try {
    console.log('Update employee request:', req.params.id, req.body);

    let employee = await Employee.findById(req.params.id).populate('user');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const { name, email, department, position, phoneNumber, address, status } = req.body;

    // Update user fields
    if (name || email || department || position || phoneNumber || address) {
      const userUpdateData = {};
      if (name) userUpdateData.name = name;
      if (email) userUpdateData.email = email;
      if (department) userUpdateData.department = department;
      if (position) userUpdateData.position = position;
      if (phoneNumber) userUpdateData.phoneNumber = phoneNumber;
      if (address) userUpdateData.address = address;

      await User.findByIdAndUpdate(employee.user._id, userUpdateData, {
        runValidators: true
      });
    }

    // Update employee status if provided
    if (status) {
      employee = await Employee.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      ).populate('user');
    }

    console.log('Employee updated successfully');
    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Delete employee and associated user
    await Employee.findByIdAndDelete(req.params.id);
    await User.findByIdAndDelete(employee.user);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Reset employee password
// @route   PUT /api/employees/:id/reset-password
// @access  Private/Admin
exports.resetEmployeePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const employee = await Employee.findById(req.params.id).populate('user');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Update user password
    employee.user.password = newPassword;
    await employee.user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};
