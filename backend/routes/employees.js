const express = require('express');
const { check } = require('express-validator');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employees');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(protect, authorize('admin'), getEmployees)
  .post(
    protect,
    authorize('admin'),
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
      check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
      check('department', 'Department is required').not().isEmpty(),
      check('position', 'Position is required').not().isEmpty(),
      check('phoneNumber', 'Phone number is required').not().isEmpty(),
      check('address', 'Address is required').not().isEmpty()
    ],
    createEmployee
  );

router
  .route('/:id')
  .get(protect, getEmployee)
  .put(protect, authorize('admin'), updateEmployee)
  .delete(protect, authorize('admin'), deleteEmployee);

// Password reset route
router.put('/:id/reset-password', protect, authorize('admin'), require('../controllers/employees').resetEmployeePassword);

module.exports = router;
