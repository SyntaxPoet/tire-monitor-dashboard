# 🚨 Tire Monitor - Critical Debugging Guide

## 📱 iOS Safari Camera Setup (MOST IMPORTANT FOR MOBILE USERS)

### **⚠️ CRITICAL: iOS Safari Camera Permissions**

**If you're using iPhone/iPad and getting camera errors, follow these steps FIRST:**

#### **Step 1: Enable Camera in Safari Settings**
```
Settings App → Safari → Camera → Allow
```

#### **Step 2: Clear Safari Data (Important!)**
```
Settings → Safari → Clear History and Website Data
```

#### **Step 3: Test Camera Access**
1. Open Safari on your iPhone/iPad
2. Navigate to your tire monitor app
3. Click any tire position (Front Left, Front Right, etc.)
4. Tap the "📷 Grant Camera Access" button
5. **Allow** the camera permission when Safari prompts you
6. **Check Safari's address bar** - there might be a camera icon to tap

#### **Step 4: Alternative Browsers**
- **Chrome for iOS**: Download from App Store (better camera support)
- **Firefox for iOS**: Alternative option with good camera support

### **🔧 iOS Safari Troubleshooting:**

**✅ Make sure you're using Safari (not Chrome)**
**✅ Check: Settings → Safari → Camera → "Allow"**
**✅ Try: Airplane mode on/off to reset permissions**
**✅ Ensure: You're on HTTPS (camera requires secure connection)**

### **🎯 Quick iOS Safari Fix:**
1. **Settings → Safari → Camera → Allow**
2. **Settings → Safari → Clear History and Website Data**
3. **Restart Safari completely**
4. **Try camera access again**

---

## 🔥 Most Common Issues & Immediate Checks

### 1. **"Network Error" When Adding Vehicles**
**Symptoms:**
- ✅ Frontend loads fine
- ✅ Can click "Add Vehicle"
- ✅ Form opens correctly
- ❌ "Network error" on submit
- ❌ 500 errors in server logs

**IMMEDIATE CHECKS:**
```bash
# Check if .env file exists
ls -la .env

# Check if DATABASE_URL is set
echo $DATABASE_URL

# Check if database file exists
ls -la dev.db

# Check server logs for Prisma errors
tail -f server.log | grep -i prisma
```

**ROOT CAUSE CHECKLIST:**
- [ ] `.env` file exists in project root
- [ ] `DATABASE_URL="file:./dev.db"` is in `.env`
- [ ] Database file `dev.db` exists
- [ ] No permission errors on database file
- [ ] Prisma client can initialize without errors

### 2. **API Returns 500 Errors**
**Quick Diagnosis:**
```bash
# Test API directly
curl http://localhost:3000/api/vehicles

# Check server console for:
# - "PrismaClientConstructorValidationError"
# - "Environment variable not found: DATABASE_URL"
# - "Failed to connect to database"
```

### 3. **Server Won't Start**
**Check Order:**
1. Environment variables loaded
2. Database file accessible
3. Prisma client initializes
4. API routes load
5. Frontend compiles

## 🛠️ Debug Commands (Run in Order)

```bash
# 1. Environment Check
echo "DATABASE_URL: $DATABASE_URL"
cat .env 2>/dev/null || echo ".env file not found"

# 2. Database Check
ls -la dev.db 2>/dev/null || echo "Database file missing"
file dev.db 2>/dev/null || echo "Cannot read database file"

# 3. Prisma Check
npx prisma db push --accept-data-loss
npx prisma generate

# 4. Server Test
npm run dev
# Look for "✅ DATABASE: Connected to database successfully"
```

## 📊 Key Log Messages to Watch For

### ✅ GOOD Signs:
```
✅ DATABASE: Prisma client created successfully
✅ DATABASE: Connected to database successfully
✅ VEHICLES API: Vehicle created successfully
```

### ❌ BAD Signs (IMMEDIATE ACTION REQUIRED):
```
❌ DATABASE: FATAL ERROR - DATABASE_URL environment variable is not set
❌ PrismaClientConstructorValidationError
❌ Environment variable not found: DATABASE_URL
❌ Failed to connect to database
```

## 🎯 5-Minute Debug Checklist

**Time: 0-1 minute:**
- [ ] Check browser console for red error messages
- [ ] Look for "PrismaClientConstructorValidationError"

**Time: 1-2 minutes:**
- [ ] Verify `.env` file exists: `ls -la .env`
- [ ] Check DATABASE_URL value: `cat .env`

**Time: 2-3 minutes:**
- [ ] Test database: `ls -la dev.db`
- [ ] Reset Prisma: `npx prisma generate`

**Time: 3-5 minutes:**
- [ ] Restart server with env var: `$env:DATABASE_URL = 'file:./dev.db'; npm run dev`
- [ ] Check for "Connected to database successfully" message

## 🚨 Emergency Fix (When All Else Fails)

```bash
# Nuclear option - complete reset
rm -rf node_modules .next src/generated dev.db
npm install
npx prisma generate
npx prisma db push
$env:DATABASE_URL = 'file:./dev.db'
npm run dev
```

## 📝 Future Prevention

**Code Changes Made:**
- ✅ Early DATABASE_URL validation
- ✅ File system existence checks
- ✅ Comprehensive environment logging
- ✅ API reachability tests
- ✅ Clear error messages with solutions

**Always check these first:**
1. Environment variables loaded
2. Database file exists and accessible
3. Prisma client initializes without errors
4. API endpoints respond correctly

## 🔍 Advanced Debugging

If basic checks pass but issues persist:

```bash
# Enable verbose Prisma logging
export DEBUG="prisma:*"
npm run dev

# Check Next.js environment loading
export NEXT_PUBLIC_DEBUG=1
npm run dev

# Monitor file system changes
watch -n 1 'ls -la dev.db .env'
```

## 📞 Support Checklist

**Before asking for help, provide:**
- [ ] Server startup logs (first 30 seconds)
- [ ] `.env` file contents (redact sensitive data)
- [ ] Database file status: `ls -la dev.db`
- [ ] Exact error message from browser console
- [ ] Steps to reproduce the issue

**This will reduce debugging time from hours to minutes!** 🎯
