const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Document = require('../models/Document');
const Location = require('../models/Location');
require('dotenv').config();

const cleanupDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop all collections to start fresh
    console.log('Cleaning up database...');
    
    // Drop collections if they exist
    try {
      await Employee.collection.drop();
      console.log('Dropped employees collection');
    } catch (error) {
      console.log('Employees collection does not exist');
    }

    try {
      await Document.collection.drop();
      console.log('Dropped documents collection');
    } catch (error) {
      console.log('Documents collection does not exist');
    }

    try {
      await Location.collection.drop();
      console.log('Dropped locations collection');
    } catch (error) {
      console.log('Locations collection does not exist');
    }

    try {
      await User.collection.drop();
      console.log('Dropped users collection');
    } catch (error) {
      console.log('Users collection does not exist');
    }

    // Create the single admin user
    console.log('Creating admin user...');
    
    const adminData = {
      name: 'System Administrator',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin',
      phoneNumber: '+1-555-0000',
      address: 'Admin Office, Company HQ'
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // Create admin
    const admin = await User.create(adminData);
    
    console.log('✅ Database cleanup completed!');
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
};

cleanupDatabase();
