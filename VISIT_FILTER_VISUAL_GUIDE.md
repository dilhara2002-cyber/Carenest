# Visit Management - Visual Filter Guide

## Before Fix ❌

### Prenatal Care Tab
```
┌─────────────────────────────────────┐
│ Select Mother               [▼]    │
├─────────────────────────────────────┤
│ Daneshi Senanayake (ACTIVE)    ✓   │ ← Correct
│ Sachini Fernando (DELIVERED)   ✗   │ ← WRONG! Already delivered
│ Nirmala Silva (ACTIVE)         ✓   │ ← Correct
└─────────────────────────────────────┘
Problem: Shows mothers who already gave birth!
```

### Postnatal Care Tab
```
┌─────────────────────────────────────┐
│ Select Mother               [▼]    │
├─────────────────────────────────────┤
│ Daneshi Senanayake (ACTIVE)    ✗   │ ← WRONG! Still pregnant
│ Sachini Fernando (DELIVERED)   ✓   │ ← Correct
│ Nirmala Silva (ACTIVE)         ✗   │ ← WRONG! Still pregnant
└─────────────────────────────────────┘
Problem: Shows mothers who are still pregnant!
```

---

## After Fix ✅

### Prenatal Care Tab
```
┌─────────────────────────────────────────────┐
│ Select Mother                       [▼]    │
├─────────────────────────────────────────────┤
│ Daneshi Senanayake                      ✓   │ Week 24, ACTIVE
│ Nirmala Silva                           ✓   │ Week 32, ACTIVE
└─────────────────────────────────────────────┘
✅ Only shows mothers with ACTIVE pregnancies
```

### Postnatal Care Tab
```
┌─────────────────────────────────────────────┐
│ Select Mother                       [▼]    │
├─────────────────────────────────────────────┤
│ Sachini Fernando                        ✓   │ DELIVERED (2 children)
└─────────────────────────────────────────────┘
✅ Only shows mothers with DELIVERED pregnancies

┌─────────────────────────────────────────────┐
│ Select Child                        [▼]    │
├─────────────────────────────────────────────┤
│ Baby Fernando (2024-01-15)              ✓   │
│ Anna Fernando (2026-06-20)              ✓   │
└─────────────────────────────────────────────┘
✅ Only shows children of selected mother
```

---

## Example Scenarios

### Scenario 1: Mother During Pregnancy
**Mother**: Daneshi Senanayake  
**Pregnancy Status**: ACTIVE (Week 24)  
**Children**: None yet

```
Prenatal Tab:
  ✅ Shows in dropdown
  ✅ Can schedule antenatal visits
  
Postnatal Tab:
  ❌ Hidden from dropdown
  ❌ Cannot schedule postnatal visits
  
Reason: Still pregnant, no delivery yet
```

### Scenario 2: Mother After Delivery
**Mother**: Sachini Fernando  
**Pregnancy Status**: DELIVERED  
**Children**: 2 (Baby Fernando, Anna Fernando)

```
Prenatal Tab:
  ❌ Hidden from dropdown
  ❌ Cannot schedule antenatal visits
  
Postnatal Tab:
  ✅ Shows in dropdown
  ✅ Can schedule postnatal visits
  ✅ Can select children for timeline
  
Reason: Already delivered, in postnatal phase
```

### Scenario 3: Mother with Multiple Pregnancies
**Mother**: Priyani Silva  
**Pregnancy 1**: DELIVERED (2024-05-10)  
**Pregnancy 2**: ACTIVE (Week 12)  
**Children**: 1 from first pregnancy

```
Prenatal Tab:
  ✅ Shows in dropdown (has ACTIVE pregnancy)
  ✅ Can schedule antenatal visits for current pregnancy
  
Postnatal Tab:
  ✅ Shows in dropdown (has DELIVERED pregnancy)
  ✅ Can schedule postnatal visits for first child
  ✅ Child dropdown shows first child only
  
Reason: Has both ACTIVE and DELIVERED pregnancies
```

---

## Tab Switching Behavior

### Switching: Prenatal → Postnatal

**Before:**
```
Prenatal Tab:
  Selected Mother: Daneshi (ACTIVE) ✓
```

**User clicks "Postnatal Care (After Delivery)" tab**

**After:**
```
Postnatal Tab:
  Selected Mother: (none) - cleared
  Reason: Daneshi not in DELIVERED list
  
  Available Mothers:
  - Sachini Fernando ✓
  - Priyani Silva ✓
```

### Switching: Postnatal → Prenatal

**Before:**
```
Postnatal Tab:
  Selected Mother: Sachini (DELIVERED) ✓
  Selected Child: Baby Fernando ✓
```

**User clicks "Prenatal Care (Antenatal)" tab**

**After:**
```
Prenatal Tab:
  Selected Mother: (none) - cleared
  Reason: Sachini not in ACTIVE list
  
  Available Mothers:
  - Daneshi Senanayake ✓
  - Nirmala Silva ✓
```

---

## Schedule Visit Modal

### Prenatal Tab → Schedule Visit

```
┌────────────────────────────────────────────────┐
│ Schedule Visit                        [×]     │
├────────────────────────────────────────────────┤
│ Mother                                 [▼]    │
│ ┌──────────────────────────────────────────┐  │
│ │ Daneshi Senanayake               ✓       │  │
│ │ Nirmala Silva                    ✓       │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Visit Type                             [▼]    │
│ ┌──────────────────────────────────────────┐  │
│ │ Antenatal Visit              (selected)  │  │
│ │ Postnatal Visit                          │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### Postnatal Tab → Schedule Visit

```
┌────────────────────────────────────────────────┐
│ Schedule Visit                        [×]     │
├────────────────────────────────────────────────┤
│ Mother                                 [▼]    │
│ ┌──────────────────────────────────────────┐  │
│ │ Sachini Fernando                 ✓       │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Visit Type                             [▼]    │
│ ┌──────────────────────────────────────────┐  │
│ │ Antenatal Visit                          │  │
│ │ Postnatal Visit              (selected)  │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Child                                  [▼]    │
│ ┌──────────────────────────────────────────┐  │
│ │ Baby Fernando (2024-01-15)       ✓       │  │
│ │ Anna Fernando (2026-06-20)       ✓       │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## Postnatal Timeline View

### When Mother + Child Selected

```
┌──────────────────────────────────────────────────────────┐
│ Postnatal Visit Timeline for Baby Fernando              │
│ Birth Date: January 15, 2024 • Gender: Male             │
│                                                          │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│ │ 1st     │  │ 2nd     │  │ 3rd     │  │ 4th     │   │
│ │ Visit   │  │ Visit   │  │ Visit   │  │ Visit   │   │
│ │ Day 0-5 │  │ Day 6-10│  │ Day14-21│  │ ~Day 42 │   │
│ │         │  │         │  │ (MOH)   │  │         │   │
│ │  ✓ Done │  │  ✓ Done │  │ → Next  │  │ Pending │   │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└──────────────────────────────────────────────────────────┘
```

### When No Selection

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              Please select a mother and child            │
│             to view their postnatal visit timeline       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Status Indicators

### Mother Pregnancy Status Badges

```
┌─────────────────┐
│ ACTIVE          │ ← Green: Can schedule prenatal visits
└─────────────────┘

┌─────────────────┐
│ DELIVERED       │ ← Blue: Can schedule postnatal visits
└─────────────────┘

┌─────────────────┐
│ MISCARRIAGE     │ ← Gray: Hidden from both tabs
└─────────────────┘

┌─────────────────┐
│ INACTIVE        │ ← Gray: Hidden from both tabs
└─────────────────┘
```

---

## Empty States

### Prenatal Tab - No Active Pregnancies
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   🤰 No mothers with active pregnancies                  │
│                                                          │
│   All registered mothers have either:                    │
│   • Completed their pregnancy (delivered)                │
│   • No active pregnancy at this time                     │
│                                                          │
│   Register a new pregnancy in the Pregnancies page.     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Postnatal Tab - No Delivered Pregnancies
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   👶 No mothers with delivered pregnancies               │
│                                                          │
│   All registered mothers are either:                     │
│   • Still pregnant (active pregnancy)                    │
│   • Have not delivered yet                               │
│                                                          │
│   Postnatal care is available after delivery.           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## User Flow Diagram

```
User Opens Visit Management
        │
        ▼
   Select Tab
        │
    ┌───┴────┐
    │        │
 PRENATAL POSTNATAL
    │        │
    ▼        ▼
Filter by  Filter by
 ACTIVE    DELIVERED
    │        │
    ▼        ▼
  Show     Show
 Mothers  Mothers
    │        │
    ▼        ▼
Schedule  Schedule
Antenatal Postnatal
  Visit     Visit
    │        │
    ▼        ▼
   Save     Save
```

---

## Key Takeaways

1. ✅ **Prenatal tab** = Mothers with ACTIVE pregnancies only
2. ✅ **Postnatal tab** = Mothers with DELIVERED pregnancies only
3. ✅ **Children** = Always filtered by selected mother
4. ✅ **Tab switch** = Clears selection if mother not in new filter
5. ✅ **Modal** = Shows filtered list based on current tab
6. ✅ **Timeline** = Requires both mother and child selection
7. ✅ **Clinical accuracy** = Matches Sri Lankan MOH protocols
