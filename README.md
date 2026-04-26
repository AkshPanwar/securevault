# 🔐 SecureVault — Secure File Management System

A production-ready, full-stack secure file management system with AES-256 encryption, 2FA, GSAP animations, and modern SaaS design.

---
## 🚀 Features

- 🔐 Secure Authentication (JWT + OTP)
- 📁 File Upload & Management
- 🛡️ AES-256 Encryption
- 🔄 Token-based session handling
- 🌐 Full-stack MERN application

## 🛠️ Tech Stack

- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT + OTP

## 📁 Project Structures
<!-- Email error fix updated -->
```
securevault/
├── backend/
│   ├── controllers/
│   │   ├── authController.js      # Login, signup, OTP, 2FA
│   │   ├── fileController.js      # Upload, download, CRUD, stats
│   │   ├── shareController.js     # Share, public links
│   │   └── userController.js      # Profile, password, audit log
│   ├── middleware/
│   │   ├── auth.js                # JWT protect, role restrict, audit
│   │   ├── rateLimiter.js         # Rate limiting per route
│   │   ├── upload.js              # Multer config + error handling
│   │   └── validation.js          # express-validator rules
│   ├── models/
│   │   ├── User.js                # User schema with bcrypt
│   │   ├── File.js                # File schema (encrypted metadata)
│   │   └── AuditLog.js            # Security audit trail
│   ├── routes/
│   │   ├── auth.js
│   │   ├── files.js
│   │   ├── shares.js
│   │   └── users.js
│   ├── utils/
│   │   ├── encryption.js          # AES-256-CBC file encryption
│   │   ├── jwt.js                 # Access + refresh tokens
│   │   ├── otp.js                 # OTP generation + email
│   │   └── malwareDetection.js    # File scanning + magic bytes
│   ├── uploads/                   # Encrypted file storage
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   │   ├── Sidebar.js
│   │   │   │   └── StatsCards.js
│   │   │   ├── files/
│   │   │   │   ├── FileCard.js    # Grid + list view cards
│   │   │   │   └── UploadModal.js # Drag-and-drop upload
│   │   │   └── shared/
│   │   │       ├── ShareModal.js  # Share with users + public link
│   │   │       └── LoadingScreen.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── AuthPage.js        # Login/Signup/OTP
│   │   │   ├── DashboardPage.js   # Main file manager
│   │   │   ├── FileViewerPage.js  # Preview + metadata
│   │   │   ├── SettingsPage.js    # Profile/Security/Activity
│   │   │   └── SharedFilePage.js  # Public link viewer
│   │   ├── utils/
│   │   │   ├── api.js             # Axios + token refresh
│   │   │   └── fileUtils.js       # Formatting helpers
│   │   ├── App.js
│   │   └── index.css              # Tailwind + custom CSS
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── tailwind.config.js
├── setup.js                       # Auto-generates .env files
├── package.json                   # Root with concurrently scripts
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm v9+

### 1. Clone and Setup

```bash
git clone <your-repo>
cd securevault

# Auto-generate .env files with secure secrets
node setup.js
```

### 2. Install Dependencies

```bash
npm run install:all
# OR manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Start MongoDB

```bash
# Local MongoDB
mongod

# OR use MongoDB Atlas - update MONGODB_URI in backend/.env
```

### 4. Start Development Servers

```bash
# Both frontend + backend (from root)
npm run dev

# OR separately:
npm run dev:backend   # http://localhost:5000
npm run dev:frontend  # http://localhost:3000
```

### 5. Open the App

Visit **http://localhost:3000** and create your first account.

> **💡 OTP in Development**: OTP codes print directly to the backend console. No email setup needed for testing.

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/securevault` |
| `JWT_SECRET` | Access token secret (min 32 chars) | Auto-generated |
| `JWT_REFRESH_SECRET` | Refresh token secret | Auto-generated |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `AES_ENCRYPTION_KEY` | 32-char encryption key | Auto-generated |
| `UPLOAD_DIR` | File storage path | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `52428800` (50MB) |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_USER` | Email username | — |
| `SMTP_PASS` | Email app password | — |
| `FRONTEND_URL` | CORS origin | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` |

---

## 🔒 Security Features

| Feature | Implementation |
|--------|---------------|
| File encryption | AES-256-CBC, encrypted at rest |
| Auth | JWT (15m access + 7d refresh with rotation) |
| Password hashing | bcrypt with salt rounds 12 |
| 2FA | Email OTP (6-digit, 10 min TTL) |
| Rate limiting | Per-route (15 req/15min auth, 200 req/min general) |
| Input validation | express-validator on all routes |
| Malware detection | Magic bytes + extension blocklist + content scan |
| Account lockout | 5 failed attempts → 15 min lock |
| Audit logging | All security events logged with IP + user agent |
| CORS | Strict origin configuration |
| Helmet | Security headers |

---

## 📧 Email Setup (Production)

For Gmail:
1. Enable 2-Step Verification on your Google account
2. Go to **Google Account → Security → App Passwords**
3. Generate an app password for "Mail"
4. Set in `backend/.env`:
   ```
   SMTP_USER=your@gmail.com
   SMTP_PASS=your_16_char_app_password
   ```

---

## 🎨 UI Features

- **Dark cyberpunk/vault theme** with deep navy & violet palette
- **Particle canvas** animation on auth page
- **GSAP-inspired** CSS animations (staggered card entries, float effects)
- **Drag-and-drop** file upload with progress
- **Grid/List** view toggle
- **File type icons** with color coding
- **Real-time progress** bar during encryption/upload
- **OTP input** with auto-advance and paste support

---

## 📡 API Endpoints

### Auth
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/verify-email
POST   /api/auth/verify-2fa
POST   /api/auth/refresh-token
POST   /api/auth/logout
POST   /api/auth/resend-otp
PATCH  /api/auth/toggle-2fa
GET    /api/auth/me
```

### Files
```
GET    /api/files            # List files (query: folder, sort, search)
POST   /api/files/upload     # Upload (multipart, up to 10 files)
GET    /api/files/stats      # Storage & count stats
GET    /api/files/:id        # Get file metadata
GET    /api/files/:id/download
GET    /api/files/:id/preview
PATCH  /api/files/:id        # Update name/tags/description
DELETE /api/files/:id        # Soft delete (add ?permanent=true for hard)
PATCH  /api/files/:id/restore
```

### Shares
```
POST   /api/shares/:fileId/share
DELETE /api/shares/:fileId/share/:userId
POST   /api/shares/:fileId/public-link
DELETE /api/shares/:fileId/public-link
GET    /api/shares/public/:token
```

### Users
```
GET    /api/users/profile
PATCH  /api/users/profile
PATCH  /api/users/change-password
GET    /api/users/audit-log
GET    /api/users/search?q=email
```

---

## 🛡️ Blocked File Types

The following extensions are automatically rejected by the malware scanner:

`.exe`, `.dll`, `.bat`, `.cmd`, `.vbs`, `.ps1`, `.sh`, `.bash`, `.jar`, `.class`, `.php`, `.asp`, `.py`, `.rb`, `.pl`, `.msi`, `.dmg`, `.apk`, and more.
