# EmployeeHub - Employee Management System

A modern, professional employee management system built with React.js and Node.js, featuring document management, location tracking, and comprehensive admin controls.

## 🚀 Features

### 👨‍💼 **Admin Features**
- **Employee Management**: Add, edit, and manage employee records
- **Document Verification**: Review and approve/reject employee documents
- **Location Monitoring**: Track employee check-ins and locations
- **Dashboard Analytics**: Real-time statistics and insights
- **User Management**: Complete control over employee accounts

### 👨‍💻 **Employee Features**
- **Document Upload**: Submit documents for verification
- **Location Check-in**: Record current location and work status
- **Profile Management**: Update personal information
- **Document Status**: Track verification status of uploaded documents

### 🔐 **Security Features**
- JWT-based authentication
- Role-based access control (Admin/Employee)
- Secure file upload and storage
- Protected API endpoints
- Input validation and sanitization

## 🛠️ Tech Stack

### **Frontend**
- **React.js 18** - Modern UI library
- **Material-UI (MUI)** - Professional component library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Context** - State management

### **Backend**
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Express Validator** - Input validation

### **Database & Storage**
- **MongoDB Atlas** - Cloud database service
- **Cloudinary** - Cloud-based file storage and management

### **Development Tools**
- **Nodemon** - Development server auto-restart
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📁 Project Structure

```
EmployeeManagementSystem/
├── frontend/                 # React.js frontend application
│   ├── public/              # Static files
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   └── layout/      # Layout components (Navbar, etc.)
│   │   ├── context/         # React Context providers
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service functions
│   │   └── App.js           # Main application component
│   ├── package.json         # Frontend dependencies
│   └── ...
├── backend/                 # Node.js backend application
│   ├── controllers/         # Route controllers
│   │   ├── auth.js          # Authentication logic
│   │   ├── employees.js     # Employee management
│   │   ├── documents.js     # Document handling
│   │   └── locations.js     # Location tracking
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js          # JWT authentication
│   │   └── upload.js        # File upload handling
│   ├── models/              # MongoDB schemas
│   │   ├── User.js          # User model
│   │   ├── Employee.js      # Employee model
│   │   ├── Document.js      # Document model
│   │   └── Location.js      # Location model
│   ├── routes/              # API routes
│   ├── scripts/             # Utility scripts
│   ├── utils/               # Utility functions
│   │   └── cloudinary.js    # Cloudinary configuration
│   ├── server.js            # Main server file
│   ├── package.json         # Backend dependencies
│   └── .env                 # Environment variables
└── README.md                # Project documentation
```

## ⚙️ Installation & Setup

### **Prerequisites**
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account
- Cloudinary account



### **1. Backend Setup**
```bash
cd backend
npm install
```

Add credentials in `.env` file in backend directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ems
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=1d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

NODE_ENV=development
```

### **2. Frontend Setup**
```bash
cd frontend
npm install
```


```

### **3. Start Application**

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm start
```

## 🔑 Admin Credentials

```
Email: admin@company.com
Password: admin123
```
