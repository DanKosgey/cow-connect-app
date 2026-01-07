# 📊 Database Inspector - Quick Guide

## **How to Access**

After logging in successfully:
1. Look for the **"📊 DB"** button in the top-right corner of the Home screen
2. Click it to open the Database Inspector

## **What You'll See**

### **🔐 Auth Cache Section**
Shows cached login credentials:
- **Email** - Your login email
- **User ID** - Supabase user ID
- **Staff ID** - Your collector staff ID
- **Full Name** - Your name
- **Role** - Should be "collector"
- **Last Login** - Timestamp of last login
- **Password Hash** - Encrypted password (first 30 chars shown)
- **Synced At** - When credentials were cached

**✅ If you see data here:** Login credentials are successfully cached!  
**❌ If empty:** You haven't logged in online yet

### **👨‍🌾 Farmers Section**
Shows count of cached farmers:
- **Count** - Number of farmers in local database

**✅ If count > 0:** Farmer sync worked!  
**❌ If count = 0:** Farmer sync didn't run (check console for errors)

### **📦 Collections Queue**
Shows pending collections (last 10):
- **Collection ID** - Unique identifier
- **Farmer ID** - Which farmer
- **Liters** - Amount collected
- **Status** - `pending_upload` or `uploaded`
- **Created** - When recorded

**Use this to verify:**
- Collections are being saved offline
- Pending uploads are tracked
- Sync status is updating

### **🔄 Sync Metadata**
Shows sync history:
- **Entity** - What was synced (e.g., "farmers")
- **Last Sync** - When it last synced
- **Total Synced** - How many records
- **Status** - Current sync status

## **Testing Workflow**

### **Step 1: Login Online**
1. Ensure internet is working
2. Login with valid collector credentials
3. Click **"📊 DB"** button
4. **Verify:**
   - ✅ Auth Cache shows your credentials
   - ✅ Farmers count > 0
   - ✅ Sync Metadata shows "farmers" entity

### **Step 2: Test Offline Login**
1. **Clear auth cache** (use button in DB Inspector)
2. Login online again
3. Disconnect internet
4. Logout and login again
5. Click **"📊 DB"** button
6. **Verify:**
   - ✅ Auth Cache still has your credentials
   - ✅ Can login without internet

### **Step 3: Test Offline Collection**
1. Go offline (disconnect internet)
2. Record a new collection
3. Click **"📊 DB"** button
4. **Verify:**
   - ✅ Collections Queue shows new entry
   - ✅ Status is "pending_upload"

### **Step 4: Test Auto-Sync**
1. Reconnect to internet
2. Wait 5-10 seconds
3. Click **"📊 DB"** button
4. Refresh the view
5. **Verify:**
   - ✅ Collection status changed to "uploaded"
   - ✅ Sync Metadata updated

## **Troubleshooting**

### **Problem: Auth Cache is Empty**
**Cause:** Haven't logged in online yet  
**Solution:** Login with internet connection first

### **Problem: Farmers Count is 0**
**Cause:** Farmer sync didn't run  
**Solution:** 
- Check console for errors
- Verify internet during login
- Check Supabase has approved farmers

### **Problem: Collections Not Appearing**
**Cause:** Database write failed  
**Solution:**
- Check console for errors
- Verify database is initialized
- Check file permissions

### **Problem: Sync Not Happening**
**Cause:** Background sync not running  
**Solution:**
- Check `useBackgroundSync` is called in App.tsx
- Verify internet connection
- Check console for sync errors

## **Console Commands**

You can also inspect the database directly in the browser console:

```javascript
// Get database instance
const db = await getDatabase();

// Check auth cache
const auth = await db.getAllAsync('SELECT * FROM auth_cache');
console.log('Auth:', auth);

// Check farmers
const farmers = await db.getAllAsync('SELECT COUNT(*) FROM farmers_local');
console.log('Farmers:', farmers);

// Check pending collections
const pending = await db.getAllAsync('SELECT * FROM collections_queue WHERE status = "pending_upload"');
console.log('Pending:', pending);
```

## **What Success Looks Like**

After a successful online login, you should see:

```
🔐 Auth Cache (1 entry)
✅ Email: your@email.com
✅ Staff ID: abc-123-def
✅ Password Hash: $2b$10$...

👨‍🌾 Farmers (25 cached)
✅ 25 farmers cached locally

📦 Collections Queue (0 shown)
No collections in queue

🔄 Sync Metadata (1 entity)
✅ farmers - Last Sync: 2026-01-07 15:30:00
```

This confirms:
- ✅ Credentials are cached
- ✅ Farmers are synced
- ✅ Ready for offline use!

---

**Created:** 2026-01-07  
**Purpose:** Verify offline data caching is working
