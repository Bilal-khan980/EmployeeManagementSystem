const Document = require('../models/Document');
const Employee = require('../models/Employee');
const { uploadFile, deleteFile } = require('../utils/cloudinary');
const { validationResult } = require('express-validator');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private/Admin
exports.getDocuments = async (req, res) => {
  try {
    let query;

    // If user is not admin, only show their documents
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }
      query = Document.find({ employee: employee._id });
    } else {
      query = Document.find();
    }

    const documents = await query
      .populate({
        path: 'employee',
        select: 'employeeId',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate({
        path: 'uploadedBy',
        select: 'name email'
      })
      .populate({
        path: 'verifiedBy',
        select: 'name email'
      });

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'employeeId',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate({
        path: 'uploadedBy',
        select: 'name email'
      })
      .populate({
        path: 'verifiedBy',
        select: 'name email'
      });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Make sure user is document owner or admin
    if (
      req.user.role !== 'admin' &&
      document.employee.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this document'
      });
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Upload document
// @route   POST /api/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      file: req.file ? { name: req.file.originalname, size: req.file.size } : null,
      user: req.user ? { id: req.user.id, role: req.user.role } : null
    });

    // Prevent admin from uploading documents
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admins cannot upload documents. Only employees can upload documents.'
      });
    }

    const { name, type, employeeId } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    // Find employee
    let employee;
    if (req.user.role === 'admin' && employeeId) {
      employee = await Employee.findById(employeeId);
      console.log('Admin uploading for employee:', employeeId, employee ? 'found' : 'not found');
    } else {
      employee = await Employee.findOne({ user: req.user.id });
      console.log('User uploading for self:', req.user.id, employee ? 'found' : 'not found');
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee record not found. Please contact administrator.'
      });
    }

    // Upload file to Cloudinary
    const fileUrl = await uploadFile(req.file, 'employee-documents');

    // Create document
    const document = await Document.create({
      employee: employee._id,
      name: name || req.file.originalname,
      type,
      fileUrl,
      fileType: req.file.mimetype,
      uploadedBy: req.user.id
    });

    // Add document to employee's documents array
    employee.documents.push(document._id);
    await employee.save();

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Verify document
// @route   PUT /api/documents/:id/verify
// @access  Private/Admin
exports.verifyDocument = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid verification status'
      });
    }

    let document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Update document
    document = await Document.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: status,
        verifiedBy: req.user.id,
        verificationDate: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Make sure user is document owner or admin
    const employee = await Employee.findById(document.employee);
    if (
      req.user.role !== 'admin' &&
      employee.user.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this document'
      });
    }

    // Remove document from employee's documents array
    employee.documents = employee.documents.filter(
      doc => doc.toString() !== req.params.id
    );
    await employee.save();

    // Delete file from Cloudinary
    try {
      await deleteFile(document.fileUrl);
    } catch (cloudinaryError) {
      console.error('Error deleting file from Cloudinary:', cloudinaryError);
      // Continue with document deletion even if Cloudinary deletion fails
    }

    // Delete document
    await Document.findByIdAndDelete(req.params.id);

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
