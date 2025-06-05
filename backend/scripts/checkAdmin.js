const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const checkAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('❌ No admin user found!');
      process.exit(1);
    }

    console.log('✅ Admin user found:');
    console.log('ID:', admin._id);
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('Phone:', admin.phoneNumber);
    console.log('Address:', admin.address);
    console.log('Created:', admin.createdAt);

    // Test password
    const testPassword = 'admin123';
    const adminWithPassword = await User.findById(admin._id).select('+password');
    const isMatch = await adminWithPassword.matchPassword(testPassword);
    
    console.log('\n🔑 Password test:');
    console.log('Test password "admin123":', isMatch ? '✅ CORRECT' : '❌ INCORRECT');
    
    if (!isMatch) {
      console.log('\n🔧 Fixing password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      
      await User.findByIdAndUpdate(admin._id, { password: hashedPassword });
      console.log('✅ Password updated to "admin123"');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkAdmin();
