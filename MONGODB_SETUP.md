# 🚀 AURA Interaction Tracker - MongoDB Integration Setup

## Overview

The AURA Interaction Tracker now includes user authentication and MongoDB integration for secure data storage. This guide will walk you through setting up the complete system.

## 📋 Prerequisites

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5.0 or higher) - Choose one:
  - [MongoDB Community Edition](https://www.mongodb.com/try/download/community) (Local)
  - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Cloud - Free tier available)
- **Chrome/Firefox** browser
- **Git** (optional)

---

## 🔧 Part 1: Backend Server Setup

### Step 1: Navigate to Server Directory

```bash
cd D:\Ext\server
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `express-validator` - Input validation

### Step 3: Configure Environment Variables

Create a `.env` file in the `server/` directory:

```bash
# Copy the example file
copy .env.example .env
```

Edit `.env` and update:

```env
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/aura_tracker

# OR for MongoDB Atlas (recommended):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aura_tracker?retryWrites=true&w=majority

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-random-secret-key-at-least-32-characters-long

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Step 4: Start MongoDB

**Option A: Local MongoDB**
```bash
# Windows (if installed as service)
net start MongoDB

# macOS/Linux
mongod
```

**Option B: MongoDB Atlas**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update MONGODB_URI in `.env`

### Step 5: Start the Server

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 AURA Tracker API running on port 3000
📊 Environment: development
```

---

## 🌐 Part 2: Extension Setup

### Step 1: Update Extension Configuration

The extension is already configured to connect to `http://localhost:3000`. If your server is on a different URL, edit `config.js`:

```javascript
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api',  // Change this if needed
  // ...
};
```

### Step 2: Load Extension in Chrome

1. **Ensure Chrome manifest is active:**
   ```bash
   cd D:\Ext
   copy manifest-chrome.json manifest.json
   ```

2. **Open Chrome Extensions:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `D:\Ext` folder

3. **Reload if already loaded:**
   - Click the refresh icon on the extension card

### Step 3: Test the Extension

1. Click the AURA extension icon
2. You should see the **Login/Register** screen
3. Create a new account or login

---

## 🎯 Part 3: Using the System

### First Time Setup

1. **Register a New Account:**
   - Click "Register" tab
   - Fill in:
     - Full Name
     - Email
     - Password (minimum 6 characters)
     - Organization (optional)
   - Click "Create Account"

2. **Grant Consent:**
   - Read the privacy policy
   - Click "Accept & Enable Tracking"

3. **Start Tracking:**
   - The extension will now track your interactions
   - Data is automatically synced to MongoDB every 30 seconds

### Logging In

- Enter your email and password
- Click "Login"
- Your previous settings and data will be loaded

---

## 📊 Part 4: API Endpoints

The backend provides the following endpoints:

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/settings` | Update user settings |
| POST | `/api/auth/logout` | Logout user |

### Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interactions/batch` | Save multiple interactions |
| GET | `/api/interactions` | Get user's interactions (paginated) |
| GET | `/api/interactions/recent` | Get recent interactions |
| DELETE | `/api/interactions/clear` | Clear all user interactions |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get user statistics |

---

## 🔒 Security Features

### Password Security
- Passwords are hashed using bcrypt (10 rounds)
- Passwords are never stored in plain text
- Password validation (minimum 6 characters)

### JWT Authentication
- Token-based authentication
- 30-day token expiration
- Tokens stored securely in extension storage

### Data Privacy
- Each user's data is isolated
- Interactions are tied to user IDs
- Auto-deletion after 30 days (configurable)

### CORS Protection
- Only browser extensions can access the API
- Configurable allowed origins

---

## 🛠️ Troubleshooting

### Server Won't Start

**Error: "MongoDB connection error"**
```bash
# Check if MongoDB is running
# Windows:
sc query MongoDB

# macOS/Linux:
ps aux | grep mongod
```

**Error: "Port 3000 already in use"**
```bash
# Change PORT in .env file
PORT=3001
```

### Extension Issues

**Error: "Failed to login"**
- Check if server is running (`http://localhost:3000`)
- Check browser console for errors (F12)
- Verify manifest.json has correct permissions

**Error: "Authentication token"**
- Logout and login again
- Clear extension storage:
  - Chrome: `chrome://extensions/` → Details → Clear storage data

### Database Issues

**MongoDB Connection Fails:**
```bash
# Verify MongoDB URI
mongo "mongodb://localhost:27017/aura_tracker"

# For Atlas, test connection string in MongoDB Compass
```

---

## 📈 Production Deployment

### Backend Deployment

1. **Choose a hosting provider:**
   - Heroku
   - DigitalOcean
   - AWS
   - Google Cloud
   - Render

2. **Set environment variables:**
   ```env
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-secret
   NODE_ENV=production
   PORT=80
   ```

3. **Update extension config.js:**
   ```javascript
   BASE_URL: 'https://your-server.com/api'
   ```

### MongoDB Atlas (Recommended for Production)

1. Create production cluster
2. Set up IP whitelist
3. Create database user
4. Get connection string
5. Update MONGODB_URI

---

## 📊 Monitoring

### Check Server Health

```bash
curl http://localhost:3000
```

Response:
```json
{
  "message": "🌟 AURA Interaction Tracker API",
  "version": "1.0.0",
  "status": "running"
}
```

### MongoDB Data

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/aura_tracker

# View collections
show collections

# Count users
db.users.count()

# View recent interactions
db.interactions.find().limit(10)
```

---

## 🎓 Next Steps

1. **Customize tracking** - Adjust which interactions to track
2. **Export data** - Download your interaction data as CSV
3. **View statistics** - Monitor your browsing patterns
4. **Scale up** - Deploy to production for team usage

---

## 🆘 Support

- **Issues:** Check server logs and browser console
- **Questions:** Review this guide and API documentation
- **Database:** MongoDB documentation at mongodb.com

---

## ✅ Quick Start Checklist

- [ ] Node.js installed
- [ ] MongoDB running (local or Atlas)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Server started (`npm start`)
- [ ] Extension loaded in Chrome
- [ ] Account created
- [ ] Consent granted
- [ ] Tracking enabled!

---

**Made with ❤️ by AURA - Unleash the Future of UI**

