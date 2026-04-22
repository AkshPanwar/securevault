# SecureVault — Premium UI Redesign

## What Was Redesigned (Frontend Only)

All backend files are **completely untouched**. Only frontend files were replaced.

### Design Philosophy
- **Aesthetic**: Obsidian-dark glassmorphism — inspired by Apple's spatial design, Linear, and Vercel
- **Typography**: Syne (display headings) + DM Sans (body) + JetBrains Mono (code/labels)
- **Color**: Deep space dark (#030308 base) with indigo (#5b5aff) accent, teal (#00c9a7) success, rose (#ff3860) danger
- **Depth**: Multi-layer glass effects, blur, noise texture overlay, ambient orb glows
- **Motion**: CSS cubic-bezier spring animations, staggered fade-ins, hover micro-interactions

### Files Changed
```
frontend/
  public/index.html              ← Added font preloading, dark bg flash prevention
  src/index.css                  ← Complete design system rewrite
  src/App.js                     ← Updated toast theme
  tailwind.config.js             ← New color palette + animations
  package.json                   ← Removed framer-motion (not needed)
  src/pages/
    AuthPage.js                  ← Split-panel login/signup with particle canvas
    DashboardPage.js             ← Premium file grid with glass cards
    FileViewerPage.js            ← Clean file preview with metadata sidebar
    SettingsPage.js              ← Tabbed settings with toggle 2FA
    SharedFilePage.js            ← Public link page
  src/components/
    dashboard/Sidebar.js         ← Frosted glass sidebar with storage bar
    dashboard/StatsCards.js      ← 4-metric stat grid with color glows
    files/FileCard.js            ← Grid + list file cards with hover menus
    files/UploadModal.js         ← Drag & drop with upload progress
    shared/ShareModal.js         ← People & link sharing tabs
    shared/LoadingScreen.js      ← Animated logo loading state
```

### Files NOT Changed (Backend)
```
backend/
  server.js          ← UNTOUCHED
  controllers/       ← UNTOUCHED
  models/            ← UNTOUCHED
  routes/            ← UNTOUCHED
  middleware/        ← UNTOUCHED
  utils/             ← UNTOUCHED
```

---

## Setup & Run

### Prerequisites
- Node.js 16+
- MongoDB running locally (or update MONGODB_URI in backend/.env)

### 1. Install dependencies
```bash
# From root directory
npm install              # installs concurrently
cd backend && npm install
cd ../frontend && npm install
```

Or use the helper script:
```bash
npm run install:all
```

### 2. Configure environment
Backend (`backend/.env`) — already pre-configured with generated secrets.
Frontend (`frontend/.env`):
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Start MongoDB
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or use MongoDB Atlas and update MONGODB_URI in backend/.env
```

### 4. Run everything with ONE command
```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:5000`
- **Frontend** on `http://localhost:3000`

---

## API Endpoints Used (Unchanged)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/verify-email` | OTP verification |
| POST | `/api/auth/verify-2fa` | 2FA verification |
| POST | `/api/auth/refresh-token` | Refresh JWT |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/resend-otp` | Resend OTP |
| PATCH | `/api/auth/toggle-2fa` | Enable/disable 2FA |
| GET | `/api/auth/me` | Current user |
| GET | `/api/files` | List files |
| GET | `/api/files/stats` | Storage stats |
| GET | `/api/files/:id` | Get file |
| GET | `/api/files/:id/download` | Download |
| GET | `/api/files/:id/preview` | Preview |
| POST | `/api/files/upload` | Upload (multipart) |
| PATCH | `/api/files/:id` | Update (rename/star) |
| DELETE | `/api/files/:id` | Move to trash |
| PATCH | `/api/files/:id/restore` | Restore |
| GET | `/api/users/profile` | Profile |
| PATCH | `/api/users/profile` | Update profile |
| PATCH | `/api/users/change-password` | Change password |
| GET | `/api/users/audit-log` | Activity log |
| POST | `/api/shares/:fileId/share` | Share with user |
| DELETE | `/api/shares/:fileId/share/:userId` | Revoke share |
| POST | `/api/shares/:fileId/public-link` | Create public link |
| DELETE | `/api/shares/:fileId/public-link` | Revoke public link |
| GET | `/api/shares/public/:token` | View public file |

---

## Troubleshooting

**Port 3000 already in use**: Kill the process or set `PORT=3001` in `frontend/.env`

**MongoDB connection failed**: Make sure MongoDB is running, check `MONGODB_URI` in `backend/.env`

**OTP not received**: In development mode, OTPs are printed to the backend console. Check terminal output.

**CORS error**: Ensure `FRONTEND_URL=http://localhost:3000` in `backend/.env`
