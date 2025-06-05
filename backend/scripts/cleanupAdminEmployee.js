const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
require('dotenv').config();

const cleanupAdminEmployee = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No admin user found');
      process.exit(0);
    }

    console.log('Admin user found:', adminUser.email);

    // Find and delete any Employee record for admin user
    const adminEmployee = await Employee.findOne({ user: adminUser._id });
    if (adminEmployee) {
      console.log('Found admin employee record, deleting...');
      await Employee.findByIdAndDelete(adminEmployee._id);
      console.log('✅ Admin employee record deleted');
    } else {
      console.log('✅ No admin employee record found (good!)');
    }

    // Show current employee count
    const employeeCount = await Employee.countDocuments();
    console.log(`📊 Total employee records: ${employeeCount}`);

    // Show employees with their user roles
    const employees = await Employee.find().populate('user', 'name email role');
    console.log('\n📋 Current employees:');
    employees.forEach(emp => {
      console.log(`- ${emp.user?.name || 'Unknown'} (${emp.user?.email || 'No email'}) - Role: ${emp.user?.role || 'Unknown'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

cleanupAdminEmployee();
