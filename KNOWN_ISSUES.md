# Known Issues - ProjectHub Backend & Frontend

## 🔴 Critical Issues Requiring Testing

### 1. Calendar Sync TypeScript Compilation Error
**Status**: ⚠️ Partially Fixed - Needs Testing  
**Priority**: High  
**Component**: Backend - Calendar Sync Service

**Problem**:
- Kiro IDE keeps auto-reverting the `MicrosoftGraphAuthProvider.getAccessToken()` method
- Changes from `async getAccessToken(): Promise<string>` back to `getAccessToken(): string`
- Causes TypeScript compilation errors when building

**Current Fix Applied**:
- Added `async` keyword and `Promise<string>` return type
- Added `prettier-ignore` comment
- Added comprehensive warning comments
- Created steering rule in `.kiro/steering/microsoft-graph-auth.md`
- Used `Promise.resolve()` for explicit Promise return

**Testing Required**:
- [ ] Verify TypeScript compilation passes: `npm run build`
- [ ] Verify dev server starts without errors: `npm run start:dev`
- [ ] Check if IDE continues to revert changes
- [ ] Test actual calendar sync functionality

**Files Affected**:
- `src/services/calendar-sync.service.ts` (lines 85-100)
- `.kiro/steering/microsoft-graph-auth.md`

---

### 2. Chat Message History Not Persisting
**Status**: 🔴 Fixed but Not Working - Needs Investigation  
**Priority**: High  
**Component**: Frontend - AI Assistant Chat

**Problem**:
- Chat conversations show in sidebar after refresh
- Individual messages within conversations disappear after page refresh
- Users lose their chat history when refreshing the page

**Root Cause Analysis**:
- Zustand persistence was only saving `conversations` array
- `messages` array was not included in persistence configuration
- `activeConversation` state was not persisted

**Fix Applied**:
- Updated Zustand persistence config to include `messages` and `activeConversation`
- Added storage version control (v2) to clear old incompatible data
- Improved conversation selection to check for cached messages first
- Added fallback to API when no cached messages exist

**Still Not Working - Possible Causes**:
1. **Frontend Issue**: 
   - Persistence config not taking effect
   - Storage version migration not working
   - Component not reading from persisted state correctly

2. **Backend Issue**:
   - API endpoints not returning message history
   - Database not storing messages properly
   - Authentication issues preventing message retrieval

**Testing Required**:
- [ ] Check browser localStorage for `ai-assistant-storage` data
- [ ] Verify API endpoints return message history: `GET /api/ai/conversations/{id}/messages`
- [ ] Test message creation: `POST /api/ai/ask`
- [ ] Check database for stored messages
- [ ] Verify frontend store state after refresh

**Files Affected**:
- `frontend/src/stores/ai-assistant.ts` (persistence config)
- `src/controllers/ai-assistant.controller.ts` (API endpoints)
- Backend message/conversation entities

---

## 🟡 Minor Issues

### 3. Frontend Build Warnings
**Status**: ⚠️ Known Issue  
**Priority**: Low  
**Component**: Frontend Build Process

**Problem**:
- Duplicate export warnings in project components
- Multiple lockfile warnings
- Turbopack filesystem performance warnings

**Files Affected**:
- `frontend/src/components/features/projects/index.ts`
- Multiple `package-lock.json` files

---

## 🔧 Debugging Steps for Chat Issue

### Frontend Debugging:
```bash
# Check if persistence is working
# Open browser dev tools → Application → Local Storage
# Look for key: ai-assistant-storage

# Check store state
console.log(useAIAssistantStore.getState())

# Test API calls manually
fetch('/api/ai/conversations')
fetch('/api/ai/conversations/{id}/messages')
```

### Backend Debugging:
```bash
# Check if backend is running
curl http://localhost:3000/api/health

# Test AI endpoints
curl -X GET http://localhost:3000/api/ai/conversations
curl -X POST http://localhost:3000/api/ai/ask -H "Content-Type: application/json" -d '{"query":"test"}'

# Check database
# Connect to your database and verify:
# - conversations table has data
# - messages table has data
# - Foreign key relationships are correct
```

---

## 📋 Next Steps

1. **Immediate Priority**: Investigate chat message persistence
   - Determine if it's a frontend or backend issue
   - Check API responses and database state
   - Verify localStorage persistence

2. **Secondary Priority**: Monitor calendar sync auto-reversion
   - Test if steering rules prevent IDE changes
   - Consider alternative approaches if issue persists

3. **Long-term**: Address build warnings and optimize development workflow

---

## 📝 Notes

- Both issues were identified during development session on 9/28/2025
- Calendar sync issue has multiple safeguards in place but needs verification
- Chat persistence issue requires deeper investigation to determine root cause
- Consider implementing automated tests to catch these regressions early