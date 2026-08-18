# Filter Update Summary - Mothers Management Page

## Changes Made

### ✅ Removed Filter
**"Assigned midwife name" text input filter**
- Previously: A text input field where users could type midwife names to search
- Reason for removal: Redundant and could be confusing alongside the midwife dropdown (admin only)

### ✅ Added Filter
**"Care Plan" dropdown filter**
- **Options:**
  - "Normal Care" - Shows mothers on standard care plan
  - "Special Attention" - Shows mothers requiring special attention

---

## Files Modified

### 1. Frontend - `src/app/(dashboard)/mothers/page.tsx`

#### State Variables Changed:
```typescript
// REMOVED
const [assignedMidwifeSearch, setAssignedMidwifeSearch] = useState('');

// ADDED
const [carePlanFilter, setCarePlanFilter] = useState('');
```

#### Filter UI Changed:
```tsx
// REMOVED - Text input for midwife name search
<input
  type="text"
  placeholder="Assigned midwife name..."
  value={assignedMidwifeSearch}
  onChange={(e) => setAssignedMidwifeSearch(e.target.value)}
/>

// ADDED - Dropdown for care plan filter
<Select
  value={carePlanFilter}
  onChange={(e) => setCarePlanFilter(e.target.value)}
  options={[
    { value: 'normal', label: 'Normal Care' },
    { value: 'special', label: 'Special Attention' },
  ]}
  placeholder="Care plan"
/>
```

#### Dependencies Updated:
```typescript
// fetchMothers now triggers on carePlanFilter instead of assignedMidwifeSearch
useEffect(() => {
  fetchMothers();
}, [searchTerm, carePlanFilter, accountStatus, bloodGroupFilter, midwifeFilterId]);
```

#### Clear Filters Updated:
```typescript
onClick={() => {
  setSearchTerm('');
  setCarePlanFilter('');        // Instead of setAssignedMidwifeSearch('')
  setAccountStatus('all');
  setBloodGroupFilter('');
  setMidwifeFilterId('');
}}
```

### 2. Backend - `src/app/api/mothers/route.ts`

#### Query Parameters Changed:
```typescript
// REMOVED
const assignedMidwifeSearch = searchParams.get('assignedMidwife') || '';

// ADDED
const carePlan = searchParams.get('carePlan') || '';
```

#### Filter Logic Changed:
```typescript
// REMOVED - Filter by midwife name (text search)
if (assignedMidwifeSearch) {
  where.assignedMidwife = {
    user: {
      name: { contains: assignedMidwifeSearch, mode: 'insensitive' },
    },
  };
}

// ADDED - Filter by care plan (needsSpecialAttention boolean)
if (carePlan === 'normal') {
  where.needsSpecialAttention = false;
} else if (carePlan === 'special') {
  where.needsSpecialAttention = true;
}
```

---

## Filter Layout

### Current Filter Section (after changes):
```
┌─────────────────────────────────────────────────────────────┐
│  Search bar (full width)                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Care Plan   │ Midwife*    │ Account     │ Blood       │
│ Dropdown    │ Dropdown    │ Status      │ Group       │
│             │ (Admin only)│ Dropdown    │ Dropdown    │
└─────────────┴─────────────┴─────────────┴─────────────┘

                                    [Clear Filters]
```

*Midwife dropdown only visible to Admin users

---

## Functional Behavior

### Care Plan Filter Options:

1. **No selection (default)**
   - Shows ALL mothers (both normal and special attention)
   - Placeholder: "Care plan"

2. **"Normal Care" selected**
   - Shows only mothers where `needsSpecialAttention = false`
   - Badge in table shows: "Normal Care" (default variant)

3. **"Special Attention" selected**
   - Shows only mothers where `needsSpecialAttention = true`
   - Badge in table shows: "Special Attention" (warning variant)

### Integration with Other Filters:
- Care plan filter works independently alongside:
  - Search bar (name, email, phone, assigned midwife)
  - Midwife filter (admin only)
  - Account status filter (active/inactive)
  - Blood group filter

- All filters use **AND** logic (not OR)
- Example: "Special Attention" + "A+" blood group = Shows only special attention mothers with A+ blood

---

## Use Cases

### For Midwives:
- Quickly filter to see which of their assigned mothers need special attention
- Focus on high-priority cases
- Review normal care cases separately

### For Admins:
- Get overview of all special attention cases across all midwives
- Monitor care plan distribution
- Combine with midwife filter to see specific midwife's special cases

---

## Database Field Reference

The care plan filter uses the `needsSpecialAttention` boolean field:

```prisma
model Mother {
  id                      String   @id @default(cuid())
  needsSpecialAttention   Boolean  @default(false)
  // ... other fields
}
```

- `needsSpecialAttention = false` → "Normal Care"
- `needsSpecialAttention = true` → "Special Attention"

---

## Testing Checklist

### ✅ UI Tests:
- [ ] Old "Assigned midwife name" text input is removed
- [ ] New "Care Plan" dropdown appears in first position
- [ ] Dropdown shows "Care plan" placeholder when no selection
- [ ] Dropdown shows "Normal Care" and "Special Attention" options
- [ ] Selecting an option filters the table correctly
- [ ] "Clear Filters" button resets care plan selection

### ✅ Functionality Tests:
- [ ] Select "Normal Care" - only mothers with needsSpecialAttention=false shown
- [ ] Select "Special Attention" - only mothers with needsSpecialAttention=true shown
- [ ] Combine with blood group filter - both filters apply
- [ ] Combine with account status - both filters apply
- [ ] (Admin) Combine with midwife filter - all filters apply
- [ ] Search still searches midwife names (in the main search bar)

### ✅ API Tests:
- [ ] GET `/api/mothers?carePlan=normal` returns only normal care mothers
- [ ] GET `/api/mothers?carePlan=special` returns only special attention mothers
- [ ] GET `/api/mothers` (no carePlan param) returns all mothers
- [ ] Midwife role still only sees their assigned mothers with care plan filter

---

## Migration Notes

### No Database Migration Required
- Uses existing `needsSpecialAttention` field
- No schema changes needed
- No data migration required

### No Breaking Changes
- Removed query parameter `assignedMidwife` is no longer used
- Main search bar still searches midwife names
- All existing functionality preserved

---

## Benefits

1. **More Relevant Filtering**: Care plan is clinically significant, while text-based midwife search was redundant
2. **Better UX**: Dropdown is clearer than text input for binary choice
3. **Consistent Layout**: All filters now use dropdown components (except main search)
4. **Performance**: Boolean comparison is faster than text search
5. **Clinical Value**: Easily identify high-risk cases requiring special attention

---

## Related Features

- **Care Plan Badge**: Shown in mothers table ("Normal Care" or "Special Attention")
- **Toggle Button**: Admins/midwives can toggle care plan with heart icon
- **Care Plan Impact**: Affects Thriposha eligibility and visit scheduling priority
