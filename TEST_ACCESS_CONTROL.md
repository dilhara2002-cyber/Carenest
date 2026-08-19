# Data Access Control - Testing Guide

## Quick Test Steps

### Test 1: Midwife Cannot See Other Midwives' Filter
**Steps:**
1. Login as a midwife user (e.g., "Kumari Perera")
2. Navigate to **Mothers Management** page
3. **Expected Result**: You should NOT see a "Filter by midwife" dropdown
4. **Expected Result**: You should only see mothers assigned to you

**Screenshot Location**: Check the filter section - it should only show:
- Search bar
- Account status dropdown
- Blood group dropdown
- NO "Filter by midwife" dropdown

---

### Test 2: Midwife Cannot Access Other Midwife's Mother via API
**Steps:**
1. Login as a midwife user
2. Note one of YOUR assigned mother's IDs (e.g., `mother123`)
3. Get another midwife's assigned mother ID from admin view (e.g., `mother456`)
4. Try to access: `http://localhost:3000/api/mothers/mother456`
5. **Expected Result**: 403 Forbidden error

**API Response Should Be:**
```json
{
  "error": "Forbidden: You can only access mothers assigned to you"
}
```

---

### Test 3: Midwife Cannot Edit Other Midwife's Mother
**Steps:**
1. Login as a midwife user
2. Try to update another midwife's mother via API:
```bash
curl -X PATCH http://localhost:3000/api/mothers/{other_mother_id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```
3. **Expected Result**: 403 Forbidden error

---

### Test 4: Midwife Can Only See Their Assigned Mothers
**Steps:**
1. Login as midwife "Kumari Perera"
2. Note how many mothers you see in the list
3. Login as admin
4. Check how many mothers are assigned to "Kumari Perera"
5. **Expected Result**: Numbers should match

---

### Test 5: Admin Can See All Mothers and Filter
**Steps:**
1. Login as admin user
2. Navigate to **Mothers Management** page
3. **Expected Result**: You SHOULD see "Filter by midwife" dropdown
4. **Expected Result**: Dropdown should list all midwives
5. Select a midwife from dropdown
6. **Expected Result**: Table filters to show only that midwife's mothers

---

### Test 6: URL Manipulation Protection
**Steps:**
1. Login as midwife "Kumari Perera" (assigned to mothers A, B, C)
2. Note that midwife "Nimasha Alwis" is assigned to mothers D, E, F
3. Try to manipulate URL:
   - `http://localhost:3000/mothers?midwifeId={nimasha_id}`
4. **Expected Result**: You still only see YOUR mothers (A, B, C), not Nimasha's

**Backend Behavior:**
- The `midwifeId` query parameter is IGNORED for midwife users
- Server always filters by `session.user.midwifeId` for MIDWIFE role
- Only ADMIN role can use the `midwifeId` query parameter

---

## Test Database Queries

### Check Mothers Assignment
```sql
-- Get all mothers assigned to a specific midwife
SELECT m.id, u.name, u.email, m.assignedMidwifeId
FROM Mother m
JOIN User u ON m.userId = u.id
WHERE m.assignedMidwifeId = 'midwife_id_here';
```

### Check Midwife's Session
```sql
-- Verify midwife's ID in their user session
SELECT u.id, u.name, u.email, u.role, m.id as midwife_id
FROM User u
LEFT JOIN Midwife m ON u.id = m.userId
WHERE u.email = 'midwife@example.com';
```

---

## Common Issues & Solutions

### Issue: Midwife still sees other midwives in dropdown
**Solution**: Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Old API responses cached
**Solution**: 
1. Clear browser cache
2. Restart Next.js dev server: `npm run dev`
3. Test in incognito/private window

### Issue: Session not updating
**Solution**: Logout and login again

---

## API Endpoint Security Summary

| Endpoint | Midwife Access | Admin Access |
|----------|---------------|--------------|
| GET `/api/mothers` | Only assigned mothers | All mothers |
| GET `/api/mothers/[id]` | Only if assigned | All mothers |
| PATCH `/api/mothers/[id]` | Only if assigned | All mothers |
| GET `/api/visits` | Only for assigned mothers | All visits |
| GET `/api/vaccinations` | Only for assigned mothers | All vaccinations |
| GET `/api/pregnancies` | Only for assigned mothers | All pregnancies |
| GET `/api/children` | Only for assigned mothers | All children |

---

## Verification Checklist

After testing, confirm:
- [ ] Midwife filter dropdown is hidden for midwife users
- [ ] Midwife filter dropdown is visible for admin users
- [ ] Midwife can only see their assigned mothers in the list
- [ ] Midwife gets 403 error when accessing other midwife's mother via API
- [ ] Midwife gets 403 error when trying to edit other midwife's mother
- [ ] URL manipulation with `?midwifeId=` parameter is ignored for midwives
- [ ] Admin can see all mothers and use the midwife filter
- [ ] No console errors or warnings

---

## If Issues Persist

1. **Check Session Data:**
```typescript
console.log('Session:', session);
console.log('Role:', session?.user?.role);
console.log('Midwife ID:', session?.user?.midwifeId);
```

2. **Check API Response:**
- Open Browser DevTools > Network tab
- Make a request to `/api/mothers`
- Check the actual response data
- Verify only your assigned mothers are returned

3. **Verify Database State:**
```sql
-- Check your midwife ID
SELECT * FROM Midwife WHERE userId = 'your_user_id';

-- Check mother assignments
SELECT * FROM Mother WHERE assignedMidwifeId = 'your_midwife_id';
```

---

## Contact Support

If you encounter any issues during testing, please provide:
1. Your user role (MIDWIFE or ADMIN)
2. Screenshot of the page
3. Browser console errors (F12 > Console tab)
4. Network request/response (F12 > Network tab)
