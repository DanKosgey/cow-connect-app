# 🧪 Offline Mode Testing Guide

## **Current Status: Ready for Testing**

Your offline-first implementation is complete! Here's how to test it properly.

---

## **🚨 IMPORTANT: Network Issue Detected**

You're currently experiencing `net::ERR_NAME_NOT_RESOLVED` errors, which means:
- **DNS resolution is failing** (can't find `oevxapmcmcaxpaluehyg.supabase.co`)
- **No internet connection**, or
- **Firewall/DNS blocking**

### **Fix Network First:**

```powershell
# Option 1: Flush DNS cache
ipconfig /flushdns

# Option 2: Change DNS to Google's
# Network Settings > Adapter Options > IPv4 Properties
# Primary DNS: 8.8.8.8
# Secondary DNS: 8.8.4.4

# Option 3: Check internet connection
ping google.com
```

---

## **📋 Testing Scenarios**

### **Scenario 1: First-Time Online Login (REQUIRED)**

**Prerequisites:** Working internet connection

**Steps:**
1. ✅ Ensure you have internet
2. ✅ Open the app (should show login screen)
3. ✅ Enter valid collector credentials
4. ✅ Click "Login"

**Expected Results:**
- ✅ Login succeeds
- ✅ Credentials cached to SQLite
- ✅ Farmer data synced automatically
- ✅ Redirected to Home screen
- ✅ Console shows: `"Initial farmer sync completed"`

**What Gets Cached:**
- User credentials (hashed password)
- Staff profile
- All approved farmers
- Farmer analytics

---

### **Scenario 2: Offline Login (After Online Login)**

**Prerequisites:** Must have logged in online at least once

**Steps:**
1. ✅ Disconnect from internet (turn off WiFi)
2. ✅ Reload the app
3. ✅ Enter same credentials
4. ✅ Click "Login"

**Expected Results:**
- ✅ Login succeeds using cached credentials
- ✅ Home screen loads with cached data
- ✅ Offline indicator shows: `"📴 Offline Mode • 0 pending upload(s)"`

---

### **Scenario 3: Offline Collection Recording**

**Prerequisites:** Logged in (online or offline)

**Steps:**
1. ✅ Navigate to "New Collection"
2. ✅ Search for a farmer (searches local database)
3. ✅ Enter liters (e.g., 10)
4. ✅ Optionally take a photo
5. ✅ Click "Submit Collection"

**Expected Results:**
- ✅ Collection saved to local `collections_queue`
- ✅ Success message: `"Collection saved offline. Will upload when online."`
- ✅ Photo saved to local filesystem
- ✅ Offline indicator updates: `"📴 Offline Mode • 1 pending upload(s)"`
- ✅ Collection appears in Home screen list with status "⏳ Pending Upload"

---

### **Scenario 4: Auto-Sync When Coming Online**

**Prerequisites:** Have pending offline collections

**Steps:**
1. ✅ Have 1+ pending collections (from Scenario 3)
2. ✅ Reconnect to internet (turn on WiFi)
3. ✅ Wait 5-10 seconds

**Expected Results:**
- ✅ Offline indicator changes to: `"📤 Syncing 1 collection(s)..."`
- ✅ Console shows: `"Background sync started"`
- ✅ Collections upload to Supabase
- ✅ Photos upload to Supabase Storage
- ✅ Status changes to: `"✅ Synced"`
- ✅ Offline indicator disappears (0 pending)

---

### **Scenario 5: Network Error Fallback**

**Prerequisites:** Poor/unstable internet connection

**Steps:**
1. ✅ Have unstable internet (or simulate with network throttling)
2. ✅ Try to login
3. ✅ Online login fails with network error

**Expected Results:**
- ✅ Console shows: `"Online login failed with network error, attempting offline login..."`
- ✅ Automatically falls back to offline login
- ✅ Login succeeds if credentials are cached
- ✅ User-friendly error if no cached credentials

---

### **Scenario 6: First-Time Offline Login (Should Fail)**

**Prerequisites:** Never logged in online before

**Steps:**
1. ✅ Fresh app install (or clear app data)
2. ✅ Disconnect from internet
3. ✅ Try to login

**Expected Results:**
- ❌ Login fails
- ✅ Error message: `"Offline: No saved session found. Please login online first."`
- ✅ Clear guidance to user

---

## **🔧 Demo Mode (For Testing Without Internet)**

I've added a **demo credential seeder** that pre-populates the database for testing.

### **How to Use:**

1. **The app will auto-seed on startup** (already implemented)
2. **Demo credentials:**
   - Email: `demo@collector.com`
   - Password: `demo123`

3. **Test offline mode immediately:**
   - Disconnect internet
   - Login with demo credentials
   - Record collections offline
   - Reconnect and watch auto-sync

### **⚠️ Security Warning:**
**Remove `seedOfflineCredentials.ts` before production deployment!**

---

## **📊 Verification Checklist**

### **Database Verification:**

Check SQLite database has data:

```typescript
// In browser console or React Native debugger
const db = await getDatabase();

// Check cached credentials
const auth = await db.getAllAsync('SELECT * FROM auth_cache');
console.log('Cached users:', auth);

// Check farmers
const farmers = await db.getAllAsync('SELECT COUNT(*) as count FROM farmers_local');
console.log('Cached farmers:', farmers);

// Check pending collections
const pending = await db.getAllAsync('SELECT * FROM collections_queue WHERE status = "pending_upload"');
console.log('Pending uploads:', pending);
```

### **Visual Verification:**

- ✅ **Offline Indicator** appears when offline
- ✅ **Pending count** updates in real-time
- ✅ **Collection status badges** show correct state
- ✅ **Error messages** are user-friendly

---

## **🐛 Troubleshooting**

### **Problem: "No cached credentials found"**

**Cause:** Haven't logged in online yet

**Solution:**
1. Connect to internet
2. Login online first
3. Then test offline mode

---

### **Problem: "Network Error: Please check your connection"**

**Cause:** DNS/network issues

**Solution:**
1. Check internet connection
2. Flush DNS cache
3. Try different network
4. Check firewall settings

---

### **Problem: Farmers list is empty**

**Cause:** Farmer sync didn't complete

**Solution:**
1. Check console for sync errors
2. Verify internet connection during login
3. Check Supabase has approved farmers
4. Manually trigger sync (if needed)

---

### **Problem: Collections not syncing**

**Cause:** Background sync not running

**Solution:**
1. Check `useBackgroundSync` is called in `App.tsx`
2. Verify internet connection
3. Check console for sync errors
4. Manually refresh the app

---

## **📈 Performance Expectations**

| Operation | Online | Offline |
|-----------|--------|---------|
| Login | 1-2s | <100ms |
| Farmer Search | 500ms | <50ms |
| Collection Save | 1-3s | <200ms |
| Photo Upload | 2-5s | N/A (queued) |
| Sync (1 collection) | 2-3s | N/A |

---

## **✅ Success Criteria**

Your implementation is successful if:

1. ✅ Can login online and credentials are cached
2. ✅ Can login offline with cached credentials
3. ✅ Can search farmers offline
4. ✅ Can record collections offline
5. ✅ Collections auto-sync when online
6. ✅ Network errors trigger offline fallback
7. ✅ User sees clear status indicators
8. ✅ Error messages are helpful

---

## **🚀 Next Steps**

1. **Fix your network connection** (DNS issue)
2. **Login online once** to cache credentials
3. **Test all scenarios** above
4. **Verify auto-sync** works
5. **Remove demo seeder** before production

---

**Generated:** 2026-01-07  
**Status:** Ready for Testing  
**Network Issue:** DNS resolution failing - fix this first!
