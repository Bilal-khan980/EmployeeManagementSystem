const Location = require('../models/Location');
const Employee = require('../models/Employee');
const { validationResult } = require('express-validator');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private/Admin
exports.getLocations = async (req, res) => {
  try {
    let query;

    // If user is not admin, only show their locations
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }
      query = Location.find({ employee: employee._id });
    } else {
      query = Location.find();
    }

    const locations = await query
      .populate({
        path: 'employee',
        select: 'employeeId',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single location
// @route   GET /api/locations/:id
// @access  Private
exports.getLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'employeeId',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    // Make sure user is location owner or admin
    if (
      req.user.role !== 'admin' &&
      location.employee.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this location'
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Check in location
// @route   POST /api/locations/checkin
// @access  Private
exports.checkIn = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { latitude, longitude, address, device, accuracy } = req.body;

    // Prevent admin from checking in
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admins cannot check in. Only employees can check in.'
      });
    }

    // Find employee
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Check if employee is already checked in
    const existingCheckIn = await Location.findOne({
      employee: employee._id,
      status: 'checked-in'
    });

    if (existingCheckIn) {
      return res.status(400).json({
        success: false,
        error: 'You are already checked in. Please check out first.'
      });
    }

    // Get client IP address
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Create location with enhanced data
    const location = await Location.create({
      employee: employee._id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || `Lat: ${latitude}, Lng: ${longitude}`,
      device: device || 'Unknown Device',
      ipAddress: ipAddress,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      status: 'checked-in'
    });

    // Add location to employee's locations array
    employee.locations.push(location._id);
    await employee.save();

    // Populate employee data for response
    await location.populate('employee', 'user');
    await location.populate('employee.user', 'name email');

    console.log('Employee checked in successfully:', {
      employeeId: employee._id,
      location: `${latitude}, ${longitude}`,
      address: address,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: location,
      message: 'Successfully checked in. Location sharing started.'
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Check out location
// @route   PUT /api/locations/:id/checkout
// @access  Private
exports.checkOut = async (req, res) => {
  try {
    let location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    // Make sure user is location owner
    const employee = await Employee.findById(location.employee);
    if (employee.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to check out from this location'
      });
    }

    // Update location
    location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        checkOutTime: Date.now(),
        status: 'checked-out'
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private/Admin
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    // Make sure user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this location'
      });
    }

    // Remove location from employee's locations array
    const employee = await Employee.findById(location.employee);
    employee.locations = employee.locations.filter(
      loc => loc.toString() !== req.params.id
    );
    await employee.save();

    // Delete location
    await Location.findByIdAndDelete(req.params.id);

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

// @desc    Update live location
// @route   PUT /api/locations/:id/live-update
// @access  Private
exports.updateLiveLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, timestamp } = req.body;

    // Find the location record
    let location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    // Make sure user is location owner
    const employee = await Employee.findById(location.employee);
    if (employee.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this location'
      });
    }

    // Make sure location is still checked in
    if (location.status !== 'checked-in') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update location for checked-out session'
      });
    }

    // Update location with new coordinates
    location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : location.accuracy,
        lastUpdated: new Date()
      },
      {
        new: true,
        runValidators: true
      }
    );

    console.log('Live location updated:', {
      locationId: req.params.id,
      employeeId: employee._id,
      coordinates: `${latitude}, ${longitude}`,
      accuracy: accuracy,
      timestamp: timestamp
    });

    res.status(200).json({
      success: true,
      data: location,
      message: 'Live location updated successfully'
    });
  } catch (err) {
    console.error('Live location update error:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};