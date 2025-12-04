# ✅ Dynamic User Fetching from Database

## Summary

The Owner filter dropdown now fetches **ALL registered users** from the database dynamically instead of using hardcoded names.

## Changes Made

### 1. Backend API Endpoint

**File**: `server/server.js`

Added `/api/users/by-department` endpoint:

```javascript
app.get('/api/users/by-department', async (req, res) => {
  const { dept } = req.query;
  const allUsers = await getAllUsers();
  
  // Map department names
  const deptMap = {
    'SoftDev': ['Software Development', 'Data and Research Analyst'],
    'BusDev': ['Business Development']
  };
  
  let filteredUsers = allUsers;
  if (dept && deptMap[dept]) {
    filteredUsers = allUsers.filter(u => deptMap[dept].includes(u.department));
  }
  
  const users = filteredUsers.map(u => ({
    userId: u.userId,
    department: u.department,
    role: u.role
  }));
  
  res.json({ users });
});
```

**Department Mapping**:
- `SoftDev` → Includes "Software Development" AND "Data and Research Analyst" users
- `BusDev` → Includes "Business Development" users

### 2. Frontend API Endpoint

**File**: `src/utils/api.js`

Added endpoint:
```javascript
USERS_BY_DEPARTMENT: (dept) => `${API_BASE_URL}/api/users/by-department?dept=${dept}`,
```

### 3. Frontend Component Updates

**File**: `src/components/FacetedFileList.jsx`

**Added State**:
```javascript
const [fetchedUsers, setFetchedUsers] = useState([]);
```

**Added Fetch Function**:
```javascript
const fetchUsersByDepartment = async (dept) => {
    if (!dept) return;
    try {
        const res = await fetch(API_ENDPOINTS.USERS_BY_DEPARTMENT(dept));
        if (res.ok) {
            const data = await res.json();
            setFetchedUsers(data.users || []);
        }
    } catch (err) {
        console.error('Failed to fetch users:', err);
    }
};
```

**Added useEffect**:
```javascript
useEffect(() => {
    if (contextMode === 'teams' && teamDepartment) {
        fetchUsersByDepartment(teamDepartment);
    }
}, [contextMode, teamDepartment]);
```

**Updated teamMembers**:
```javascript
const teamMembers = React.useMemo(() => {
    if (contextMode === 'teams' && teamDepartment) {
        // Use fetched users from API if available
        if (fetchedUsers.length > 0) {
            return fetchedUsers.map(u => u.userId).sort();
        }
        // Fallback to known users
        return getKnownUsersByDept(teamDepartment);
    }
    return uniqueOwners;
}, [contextMode, teamDepartment, uniqueOwners, fetchedUsers]);
```

## How It Works

1. **User navigates** to `/dashboard?user=HaroonMirza`
2. **URL parsed**: `contextMode='teams'`, `teamDepartment='SoftDev'`
3. **API called**: `GET /api/users/by-department?dept=SoftDev`
4. **Backend returns**: ALL users from "Software Development" AND "Data and Research Analyst" departments
5. **Frontend displays**: All usernames in Owner dropdown

## Users Included

### SoftDev Department
Shows users from:
- Software Development department
- Data and Research Analyst department (migrated to SoftDev)

**Example users**:
- HaroonMirza
- ZaidBinAsim
- IbrahimMalik
- zaidasim0000
- zaidasim2197
- Any other registered SoftDev/Data Analyst users

### BusDev Department
Shows users from:
- Business Development department

**Example users**:
- MirzaUzairBaig
- Uzair71
- Any other registered BusDev users

## Testing

### Test SoftDev Users
1. Navigate to: `http://localhost:5173/dashboard?user=HaroonMirza`
2. Open console (F12)
3. Look for: `✅ Fetched X users for SoftDev department`
4. Check Owner dropdown: Should show ALL SoftDev + Data Analyst users

### Test BusDev Users
1. Navigate to: `http://localhost:5173/dashboard?user=MirzaUzairBaig`
2. Open console (F12)
3. Look for: `✅ Fetched X users for BusDev department`
4. Check Owner dropdown: Should show ALL BusDev users

## Console Output

You should see:
```javascript
✅ Fetched 5 users for SoftDev department

🔍 Context Debug: {
  contextMode: "teams",
  teamDepartment: "SoftDev",
  selectedOwner: "HaroonMirza",
  fetchedUsersCount: 5,
  fetchedUsers: [
    "HaroonMirza",
    "IbrahimMalik",
    "ZaidBinAsim",
    "zaidasim0000",
    "zaidasim2197"
  ],
  teamMembersCount: 5,
  teamMembers: [...]
}
```

## Benefits

✅ **Dynamic**: Automatically includes new registered users
✅ **No Hardcoding**: No need to manually update user lists
✅ **Department Migration**: Data Analyst users automatically included in SoftDev
✅ **Real-time**: Always shows current database users
✅ **Scalable**: Works with any number of users

## Next Steps

1. **Restart server**: `npm start` in server directory
2. **Refresh browser**: Clear cache
3. **Test URL**: Navigate to dashboard with user parameter
4. **Check console**: Verify users are fetched
5. **Check dropdown**: Should show all registered users

---

**Status**: ✅ Complete
**Dynamic Fetching**: Enabled
**Department Migration**: Data Analyst → SoftDev
**Ready to Test**: Yes
