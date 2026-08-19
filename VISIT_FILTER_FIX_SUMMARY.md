# Visit Management Page - Pregnancy Status Filtering Fix

## Problem Statement
In the Visit Management page:
- The **Postnatal Care tab** was showing ALL mothers in the dropdown, including those still pregnant
- The **Prenatal Care (Antenatal) tab** was showing ALL mothers in the dropdown, including those who already gave birth
- This was confusing and clinically incorrect

## Solution Implemented

### ✅ Changes Made

#### 1. **Updated Mother Interface**
Added `pregnancies` field to the Mother interface to track pregnancy status:

```typescript
interface Mother {
  id: string;
  needsSpecialAttention: boolean;
  user: {
    name: string;
    email: string;
  };
  children: Child[];
  pregnancies?: {
    id: string;
    status: string;  // 'ACTIVE' | 'DELIVERED' | 'MISCARRIAGE' | 'INACTIVE'
  }[];
}
```

#### 2. **Added Filtering Logic**
Created a helper function that filters mothers based on the active tab:

```typescript
// Filter mothers based on active tab
const getFilteredMothersForTab = () => {
  if (activeTab === 'PRENATAL') {
    // Show only mothers with ACTIVE pregnancies
    return mothers.filter(m => 
      m.pregnancies?.some(p => p.status === 'ACTIVE')
    );
  } else {
    // Show only mothers with DELIVERED pregnancies (who have given birth)
    return mothers.filter(m => 
      m.pregnancies?.some(p => p.status === 'DELIVERED')
    );
  }
};

const filteredMothers = getFilteredMothersForTab();
```

#### 3. **Updated All Relevant Dropdowns**

**Postnatal Care Tab:**
- ✅ "Select Mother" dropdown → Shows only mothers with DELIVERED pregnancies
- ✅ "Select Child" dropdown → Shows only children of the selected mother (automatically filtered)

**Prenatal Care Tab:**
- ✅ "Assigned Mothers Prenatal Care Plan Status" table → Shows only mothers with ACTIVE pregnancies
- ✅ Schedule Visit modal → Mother dropdown shows filtered list based on current tab

**Schedule Visit Modal:**
- ✅ "Mother" dropdown → Shows filtered list based on active tab
- ✅ "Child" dropdown (for postnatal visits) → Shows only children of selected mother

---

## Files Modified

### `src/app/(dashboard)/visits/page.tsx`

**Changes:**
1. Updated `Mother` interface to include `pregnancies` field (lines 16-27)
2. Added `getFilteredMothersForTab()` helper function (lines ~105-120)
3. Created `filteredMothers` variable that updates based on active tab
4. Replaced `mothers.map` with `filteredMothers.map` in:
   - Postnatal mother selection dropdown (line ~867)
   - Postnatal child selection dropdown (line ~877)
   - Prenatal mothers summary table (line ~695)
   - Schedule Visit modal mother dropdown (line ~990)
   - Schedule Visit modal child dropdown (line ~1014)
   - Care plan display in modal (line ~1054)

---

## Behavior After Fix

### Prenatal Care (Antenatal) Tab

**Mother Dropdown Shows:**
- ✅ Only mothers with `pregnancies.status = 'ACTIVE'`
- ❌ NOT mothers who already delivered
- ❌ NOT mothers with no active pregnancy

**Example:**
- **Visible**: Daneshi Senanayake (ACTIVE pregnancy, week 24)
- **Hidden**: Sachini Fernando (DELIVERED - already gave birth)

### Postnatal Care (After Delivery) Tab

**Mother Dropdown Shows:**
- ✅ Only mothers with `pregnancies.status = 'DELIVERED'`
- ❌ NOT mothers who are still pregnant
- ❌ NOT mothers with no delivered pregnancy

**Child Dropdown Shows:**
- ✅ Only children of the selected mother
- ✅ Automatically filtered based on mother selection

**Example:**
- **Visible**: Sachini Fernando (DELIVERED pregnancy, has 2 children)
- **Hidden**: Daneshi Senanayake (still ACTIVE pregnancy, no children yet)
- **Hidden**: Nirmala Silva (never been pregnant)

---

## Data Flow

```
1. User opens Visit Management page
   ↓
2. fetchMothers() loads ALL mothers with pregnancy data from API
   ↓
3. mothers state contains full list with pregnancies
   ↓
4. getFilteredMothersForTab() filters based on activeTab
   ↓
5. filteredMothers contains only relevant mothers
   ↓
6. Dropdowns display filteredMothers.map(...)
   ↓
7. User switches tab → filteredMothers recalculates → UI updates
```

---

## API Dependency

The fix relies on the `/api/mothers` endpoint returning pregnancy information:

```typescript
// API already includes this data
include: {
  pregnancies: {
    select: { id: true, status: true },
    orderBy: { createdAt: 'desc' },
  },
  children: {
    orderBy: { birthDate: 'desc' },
  },
}
```

**No API changes needed** - the data was already being fetched, just not used for filtering.

---

## Edge Cases Handled

### 1. Mother with Multiple Pregnancies
✅ Shows in PRENATAL tab if **any** pregnancy is ACTIVE  
✅ Shows in POSTNATAL tab if **any** pregnancy is DELIVERED

### 2. Mother with No Pregnancies
❌ Hidden in both tabs (no pregnancy data)

### 3. Mother with MISCARRIAGE or INACTIVE Pregnancy
❌ Hidden in both tabs (not ACTIVE or DELIVERED)

### 4. User Role = MOTHER
✅ Mother users see their own children directly (not affected by filter)  
✅ `currentMotherDetails` provides their data

### 5. Tab Switching
✅ When user switches from PRENATAL → POSTNATAL:
- Selected mother is cleared (if different status)
- Selected child is cleared
- Dropdowns show new filtered list

---

## Testing Checklist

### ✅ Prenatal Care Tab
- [ ] Dropdown shows only mothers with ACTIVE pregnancies
- [ ] Mothers with DELIVERED pregnancies are hidden
- [ ] "Assigned Mothers" table shows only ACTIVE pregnancies
- [ ] Auto-generate button works for filtered mothers
- [ ] Schedule manually button opens modal with correct mother pre-selected

### ✅ Postnatal Care Tab
- [ ] Dropdown shows only mothers with DELIVERED pregnancies
- [ ] Mothers with ACTIVE pregnancies are hidden
- [ ] Child dropdown shows only children of selected mother
- [ ] Postnatal timeline renders for selected mother/child
- [ ] Mandatory visit scheduling works correctly

### ✅ Schedule Visit Modal
- [ ] Mother dropdown reflects current tab filter
- [ ] Switching visit type (ANTENATAL ↔ POSTNATAL) updates available options
- [ ] Child dropdown shows only children of selected mother
- [ ] Form validation prevents scheduling postnatal visit without child

### ✅ Data Integrity
- [ ] No console errors when switching tabs
- [ ] Selected values clear when switching tabs (if invalid)
- [ ] Children are correctly linked to their mothers

---

## Clinical Correctness

### Why This Matters:
1. **Prenatal visits** are for pregnant mothers → Should only show ACTIVE pregnancies
2. **Postnatal visits** are for mothers after delivery → Should only show DELIVERED pregnancies
3. **Children** are only born after delivery → Only available in POSTNATAL context

### Sri Lankan MOH Protocol:
- ✅ Prenatal: Monthly visits during pregnancy
- ✅ Postnatal: 4 mandatory visits after delivery (Day 0-5, 6-10, 14-21, 42)
- ✅ Visit 3 requires MOH Doctor clinic visit

---

## Related Features

- **Pregnancy Tracking** (`/pregnancies`) - Manages pregnancy status
- **Children Management** (`/children`) - Registers children born from deliveries
- **Mother Growth Tracker** (`/mother-growth`) - Tracks prenatal growth
- **Vaccination Tracking** (`/vaccinations`) - Schedules postnatal vaccines

---

## Future Enhancements

### Potential Improvements:
1. **Status Badge**: Show pregnancy status badge next to mother names
2. **Empty State**: Custom message when no mothers match filter
3. **Info Tooltip**: Explain why certain mothers are hidden
4. **Quick Switch**: Button to switch between tabs from modal
5. **Recent Delivery**: Highlight mothers who delivered in last 7 days

---

## Rollback Instructions

If issues arise, revert these changes:

```bash
# Revert the visits page
git checkout HEAD -- src/app/(dashboard)/visits/page.tsx
```

The fix is isolated to one file with no database migrations required.

---

## Summary

✅ **Problem**: Mixed pregnancy statuses in wrong tabs  
✅ **Solution**: Dynamic filtering based on pregnancy status  
✅ **Impact**: Improved clinical accuracy and user experience  
✅ **Risk**: Low (no API changes, isolated to one component)  
✅ **Testing**: Manual testing recommended for all scenarios  

The Visit Management page now correctly shows:
- **Prenatal tab**: Only mothers with active pregnancies
- **Postnatal tab**: Only mothers who have delivered
- **Children**: Always linked to correct mother
