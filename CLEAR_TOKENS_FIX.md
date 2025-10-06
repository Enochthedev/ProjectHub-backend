# Fix WebSocket JWT Invalid Signature Error

## The Problem
```
JsonWebTokenError: invalid signature
```

This means the token stored in your browser was signed with a different JWT_SECRET than what the backend is currently using.

## Quick Fix (Do This Now)

### Step 1: Clear Browser Storage
1. Open your browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Under **Local Storage**, find your app's domain
4. Click **Clear All** or delete these specific keys:
   - `auth-storage`
   - `token`
   - `refreshToken`
5. Under **Session Storage**, clear all as well

### Step 2: Log Out and Log Back In
1. Log out of the application
2. Close all browser tabs with the app
3. Open a new tab
4. Log in again with your credentials

### Step 3: Verify
1. Open DevTools Console
2. Look for "WebSocket connected" message
3. Should NOT see JWT errors anymore

## Why This Happens

When you change the `JWT_SECRET` in your `.env` file, all existing tokens become invalid. The tokens stored in the browser were signed with the old secret, so the backend can't verify them.

## Alternative: Programmatic Fix

If you want to force all users to re-login, you can add this to your frontend:

```typescript
// Add to your app initialization
if (typeof window !== 'undefined') {
  const currentSecret = 'v2'; // Change this when you change JWT_SECRET
  const storedSecret = localStorage.getItem('jwt-secret-version');
  
  if (storedSecret !== currentSecret) {
    // Clear all auth data
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('jwt-secret-version', currentSecret);
    window.location.href = '/login';
  }
}
```

## For Production

To avoid this issue in production:

1. **Never change JWT_SECRET** once deployed
2. If you must change it:
   - Implement token migration
   - Or force all users to re-login
   - Or support both old and new secrets temporarily

## Verify Your JWT_SECRET

Check that it's the same everywhere:

```bash
# Backend .env
grep JWT_SECRET .env

# Should output something like:
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

Make sure this value hasn't changed since you last logged in.
