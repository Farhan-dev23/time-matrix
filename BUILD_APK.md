# Time Matrix - Multi-Device & APK Build Guide

This project allows you to seamlessly use **Time Matrix** across both **Web (Laptop/PC)** and **Mobile (Android APK)** with real-time data synchronization to your central server database.

---

## 📱 How Data Sync Works (Web + Mobile App)

1. **Central Server & Database**:
   - The Flask backend (`app.py`) serves API endpoints (`/api/...`) and maintains `time_matrix.sqlite3`.
   - Both Web users and Mobile App users connect to the same server URL (e.g. `http://YOUR_SERVER_IP:5000` or `https://your-domain.com`).

2. **Cross-Device Token Sync**:
   - When you register or log in on either device, a secure Auth Token is stored.
   - All tasks, conference notes, quadrant moves, and completions instantly update on the server database.
   - Any updates made on your Mobile App will immediately show up on your Web App and vice versa.

---

## 🛠️ Step-by-Step Instructions to Build APK

### Option A: Using Ionic Capacitor (Recommended)

1. **Install Dependencies**:
   ```bash
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Initialize Capacitor**:
   ```bash
   npx cap init "Time Matrix" "com.timematrix.app"
   ```

3. **Add Android Platform**:
   ```bash
   npx cap add android
   ```

4. **Build APK**:
   ```bash
   npx cap open android
   ```
   *In Android Studio: Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.*

---

### Option B: Using PWABuilder (Fastest No-Code Method)

1. Host your project on your server.
2. Go to [pwabuilder.com](https://www.pwabuilder.com/).
3. Paste your live server URL (e.g. `https://your-domain.com`).
4. Click **Package for Android** to download your ready-to-install `.apk` file directly!

---

## 🌐 Server Setup Reminder

When running `app.py` on your server for mobile connections, ensure Flask listens on `0.0.0.0`:
```bash
python3 app.py --host=0.0.0.0 --port=5000
```
Or use `gunicorn` / `nginx` with your domain name.
