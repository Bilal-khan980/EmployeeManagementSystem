const express = require('express');
const { check } = require('express-validator');
const { register, login, getMe, logout } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Registration removed - only admin can create employees

router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  login
);

router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

module.exports = router;
