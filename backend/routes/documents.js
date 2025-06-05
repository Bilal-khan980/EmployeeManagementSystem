const express = require('express');
const { check } = require('express-validator');
const {
  getDocuments,
  getDocument,
  uploadDocument,
  verifyDocument,
  deleteDocument
} = require('../controllers/documents');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router
  .route('/')
  .get(protect, getDocuments)
  .post(
    protect,
    upload.single('file'),
    [
      check('type', 'Document type is required').not().isEmpty()
    ],
    uploadDocument
  );

router
  .route('/:id')
  .get(protect, getDocument)
  .delete(protect, deleteDocument);

router.put('/:id/verify', protect, authorize('admin'), verifyDocument);

module.exports = router;
