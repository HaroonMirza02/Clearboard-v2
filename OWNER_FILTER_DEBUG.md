# 🔍 Owner Filter Debugging Guide

## Issue

The "Filter by Owner" dropdown is not showing in the sidebar.

## Debugging Steps

### 1. Check Browser Console

Open your browser's Developer Console (F12) and look for debug messages:

```
🔍 Context Debug: {
  contextMode: "teams",
  teamDepartment: "SoftDev",
  selectedOwner: "HaroonMirza",
  teamMembersCount: 3,
  teamMembers: ["HaroonMirza", "IbrahimMalik", "ZaidBinAsim"]
}
```

### 2. Verify URL Parameters

Make sure your URL has the correct format:

✅ **Correct**: `http://localhost:5173/dashboard?user=HaroonMirza`
✅ **Correct**: `http://localhost:5173/dashboard?user=ZaidBinAsim&dept=SoftDev`
❌ **Wrong**: `http://localhost:5173/dashboard?user=Haroon` (wrong username)

### 3. Check Console Output

**If you see**:
```javascript
contextMode: "teams"
teamDepartment: "SoftDev"  
teamMembersCount: 3
```
✅ **Good!** The Owner filter should show.

**If you see**:
```javascript
contextMode: ""
teamDepartment: ""
teamMembersCount: 0
```
❌ **Problem!** URL parameters not being parsed correctly.

### 4. Condition for Showing Owner Filter

The Owner filter shows when ALL these are true:
```javascript
contextMode === 'teams' &&      // ✅ Must be in teams context
teamDepartment &&               // ✅ Must have department (SoftDev/BusDev)
teamMembers.length > 0          // ✅ Must have team members
```

## Known Users (Fallback)

Even if no files are loaded, these users should show:

**SoftDev**:
- HaroonMirza
- ZaidBinAsim
- IbrahimMalik

**BusDev**:
- MirzaUzairBaig
- Uzair71

## Common Issues

### Issue 1: Wrong Username in URL
**Problem**: `?user=Haroon` instead of `?user=HaroonMirza`
**Solution**: Use actual database username

### Issue 2: Files Not Loaded
**Problem**: `teamMembers` is empty because files haven't loaded
**Solution**: Fallback to known users (already implemented)

### Issue 3: Department Not Detected
**Problem**: User not in `USER_DEPARTMENT_MAP`
**Solution**: Add user to mapping:
```javascript
const USER_DEPARTMENT_MAP = {
    'HaroonMirza': 'SoftDev',
    'YourNewUser': 'SoftDev'  // Add here
};
```

## Testing Checklist

1. ✅ Navigate to: `http://localhost:5173/dashboard?user=HaroonMirza`
2. ✅ Open browser console (F12)
3. ✅ Look for "🔍 Context Debug:" message
4. ✅ Check `contextMode` is "teams"
5. ✅ Check `teamDepartment` is "SoftDev"
6. ✅ Check `teamMembersCount` is > 0
7. ✅ Look for Owner filter in sidebar

## Expected Console Output

```javascript
🔍 Context Debug: {
  contextMode: "teams",
  teamDepartment: "SoftDev",
  selectedOwner: "HaroonMirza",
  teamMembersCount: 3,
  teamMembers: [
    "HaroonMirza",
    "IbrahimMalik",
    "ZaidBinAsim"
  ]
}
```

## Expected UI

```
┌─────────────────────┐
│ Filter by    Clear  │
├─────────────────────┤
│ Owner               │ ← Should appear here
│ [HaroonMirza ▼]     │
├─────────────────────┤
│ Category            │
│ ○ WebDev Assets     │
│ ...                 │
└─────────────────────┘
```

## Next Steps

1. **Refresh browser**: Clear cache and reload
2. **Check console**: Look for debug messages
3. **Verify URL**: Use correct username format
4. **Report findings**: Share console output if still not working

## Quick Test URLs

Try these one by one:

1. `http://localhost:5173/dashboard?user=HaroonMirza`
2. `http://localhost:5173/dashboard?user=ZaidBinAsim`
3. `http://localhost:5173/dashboard?user=IbrahimMalik`
4. `http://localhost:5173/dashboard?user=MirzaUzairBaig`

Each should show the Owner filter dropdown!

---

**Status**: Debug logging added
**Check**: Browser console for "🔍 Context Debug:"
**Action**: Test URLs and check console output
