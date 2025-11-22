# Network Testing Setup for MinsuOrg Demo

## Overview
This guide helps you test the MinsuOrg system on multiple devices over your local network (phone + laptop).

## Your Network Details
- **Computer IP**: 192.168.1.19
- **Frontend**: http://192.168.1.19:3000
- **Backend API**: http://192.168.1.19:8000
- **Real-time Socket**: http://192.168.1.19:3001 (if using Socket.IO)

## Step 1: Ensure Backend is Running

1. Open terminal/PowerShell
2. Navigate to backend: `cd c:\laragon\www\MinsuOrg\backend`
3. Start Laravel server: `php artisan serve --host=192.168.1.19 --port=8000`
4. Verify it works: Visit `http://192.168.1.19:8000` in browser

**Note**: You may need to:
- Update `.env` with `APP_URL=http://192.168.1.19:8000`
- Run `php artisan config:cache` after changing environment

## Step 2: Frontend Already Running

The frontend is running on `http://192.168.1.19:3000` with the updated API URLs.

**Changes Made**:
- `frontend/.env.local` - Set API and Socket URLs to your IP
- `frontend/src/services/api.js` - Updated base URL to 192.168.1.19:8000
- `frontend/src/services/realtimeService.js` - Updated socket URL to 192.168.1.19:3001
- `backend/config/cors.php` - Added 192.168.1.19:3000 to allowed origins

## Step 3: Access from Phone

### On Same WiFi Network:

1. **On your phone**, open browser
2. Go to: `http://192.168.1.19:3000`
3. You should see the login page

### Test Accounts:
- **Admin** (opens events page, scan interface): 
  - Email: `admin@gmail.com`
  - Password: `12345678`

- **Student** (sees QR code):
  - Email: `vhenandrei@gmail.com`
  - Password: `12345678`

## Step 4: Full Testing Workflow

### Setup (on laptop):
1. Login as **admin** on laptop browser
2. Go to **Events** → Click **✏️ Edit** on "Birthday ni Demver"
3. Confirm event time is active (start time before now, end time after now)

### Testing Flow:

**Device 1 - Laptop (Admin/Officer)**:
1. Go to Admin Dashboard
2. Click **Attendance** tab
3. Select "Birthday ni Demver" event from dropdown
4. Click **📷 Open Camera**
5. Keep camera window open

**Device 2 - Phone (Student)**:
1. Open `http://192.168.1.19:3000` in browser
2. Login as `vhenandrei@gmail.com`
3. Go to **Profile** tab
4. You should see the active QR code
5. Point phone at laptop camera

**Expected Results**:
- ✅ Laptop camera scans phone QR code
- ✅ Attendance recorded immediately
- ✅ Toast notification shows on laptop: "✅ Attendance recorded for [Student]"
- ✅ Attendance table updates in real-time
- ✅ Student's attendance shows in Events table

## Step 5: Real-Time Updates (Optional)

If you want real-time updates across devices:

1. You need a Node.js Socket.IO server running on port 3001
2. Currently, the system works with HTTP polling as fallback
3. To enable real-time: Start Socket.IO server and update `backend/config/broadcasting.php`

## Troubleshooting

### "Cannot connect to 192.168.1.19:8000"
- Make sure backend is running: `php artisan serve --host=192.168.1.19 --port=8000`
- Check Windows Firewall allows port 8000
- Verify both devices are on same WiFi network

### "CORS Error"
- Make sure `backend/config/cors.php` includes `192.168.1.19:3000`
- Run `php artisan config:clear && php artisan config:cache`

### "Cannot access frontend from phone"
- Verify `http://192.168.1.19:3000` works on laptop first
- Check React dev server is running: `npm start` in frontend folder
- Make sure firewall allows port 3000

### Camera won't scan QR
- Make sure phone has good lighting
- QR code must be fully visible in camera frame
- Try zooming in on QR code
- Make sure event is currently active (check event times)

### Real-time updates not working
- These require Socket.IO server on port 3001
- For now, attendances update when page is refreshed
- HTTP polling provides near-real-time updates

## Demo Script

**Total time**: ~5 minutes

1. Open laptop: Admin dashboard with Attendance page open
2. Open phone: Student profile with QR code visible
3. Scan QR code with laptop camera
4. Show attendance recorded on laptop
5. Refresh phone - show updated attendance in student's events

## Quick Setup (If Restarting)

```bash
# Terminal 1: Backend
cd c:\laragon\www\MinsuOrg\backend
php artisan serve --host=192.168.1.19 --port=8000

# Terminal 2: Frontend (already running, or restart with)
cd c:\laragon\www\MinsuOrg\frontend
npm start
```

Then access from phone at: `http://192.168.1.19:3000`

## Notes

- IP address 192.168.1.19 is specific to your current network
- If network changes, update `.env.local` with new IP
- All data is stored in local MySQL database
- For production, use proper domain names and SSL certificates
