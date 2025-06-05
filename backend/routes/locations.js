const express = require('express');
const { check } = require('express-validator');
const {
  getLocations,
  getLocation,
  checkIn,
  checkOut,
  deleteLocation
} = require('../controllers/locations');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(protect, getLocations);

router
  .route('/checkin')
  .post(
    protect,
    [
      check('latitude', 'Latitude is required').not().isEmpty(),
      check('longitude', 'Longitude is required').not().isEmpty()
    ],
    checkIn
  );

router
  .route('/:id')
  .get(protect, getLocation)
  .delete(protect, authorize('admin'), deleteLocation);

router.put('/:id/checkout', protect, checkOut);

// Live location update route
router.put('/:id/live-update', protect, require('../controllers/locations').updateLiveLocation);

module.exports = router;
