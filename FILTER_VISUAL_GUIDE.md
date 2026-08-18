# Visual Guide - Filter Changes

## Before (Old Layout)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 Search mother name, email, phone, or assigned midwife...        │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────┬──────────────┬──────────────┬──────────────┐
│ Assigned midwife   │ Filter by    │ Account      │ Blood        │
│ name...            │ midwife ▼    │ status ▼     │ group ▼      │
│ (text input)       │ (Admin only) │              │              │
└────────────────────┴──────────────┴──────────────┴──────────────┘
```

## After (New Layout)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 Search mother name, email, phone, or assigned midwife...        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Care plan ▼  │ Filter by    │ Account      │ Blood        │
│              │ midwife ▼    │ status ▼     │ group ▼      │
│              │ (Admin only) │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Care Plan Dropdown Options

```
┌──────────────────────────┐
│ Care plan            [▼] │
├──────────────────────────┤
│ Normal Care              │  ← Shows mothers with needsSpecialAttention = false
│ Special Attention        │  ← Shows mothers with needsSpecialAttention = true
└──────────────────────────┘
```

---

## Example Screenshots

### Scenario 1: No Filter Selected
```
┌──────────────┐
│ Care plan ▼  │  ← Placeholder text shown
└──────────────┘

Result: Shows ALL mothers (4 mothers total)
```

### Scenario 2: Normal Care Selected
```
┌─────────────────────┐
│ Normal Care      ▼  │
└─────────────────────┘

Result: Shows only Normal Care mothers (3 mothers)
- Priyani (Normal Care)
- Mother 2 (Normal Care)
- Mother 3 (Normal Care)
```

### Scenario 3: Special Attention Selected
```
┌─────────────────────────┐
│ Special Attention    ▼  │
└─────────────────────────┘

Result: Shows only Special Attention mothers (1 mother)
- Mother 4 (Special Attention) ⚠️
```

---

## Key Visual Changes

### 1. Filter Position
- **Old**: "Assigned midwife name" was in first position (text input)
- **New**: "Care plan" is in first position (dropdown)

### 2. Filter Type
- **Old**: Free text input (users had to type)
- **New**: Dropdown with predefined options (click to select)

### 3. Visual Consistency
- **Old**: Mixed input types (text input + dropdowns)
- **New**: All dropdowns for better consistency

---

## Table Display

When you select a care plan filter, the table shows corresponding badges:

```
┌────────┬─────────┬────────────────┬────────────┬────────┐
│ NAME   │ EMAIL   │ ASSIGNED       │ CARE PLAN  │ STATUS │
│        │         │ MIDWIFE        │            │        │
├────────┼─────────┼────────────────┼────────────┼────────┤
│ Priyani│ desil...│ Kumari Perera  │ Normal     │ Active │
│        │         │                │ Care       │        │
├────────┼─────────┼────────────────┼────────────┼────────┤
│ Mother2│ moth... │ Nimasha Alwis  │ Normal     │ Active │
│        │         │                │ Care       │        │
├────────┼─────────┼────────────────┼────────────┼────────┤
│ Mother3│ moth... │ Kumari Perera  │ ⚠️ Special │ Active │
│        │         │                │ Attention  │        │
└────────┴─────────┴────────────────┴────────────┴────────┘
```

---

## Color Coding

### Normal Care Badge
```
┌──────────────┐
│ Normal Care  │  ← Gray/Default color
└──────────────┘
```

### Special Attention Badge
```
┌────────────────────┐
│ ⚠️ Special Attention │  ← Yellow/Orange color (warning)
└────────────────────┘
```

---

## Combined Filter Example

### Filter: Special Attention + Blood Group A+

```
┌─────────────────────────┬──────────────┐
│ Special Attention    ▼  │ A+        ▼  │
└─────────────────────────┴──────────────┘

Result: Shows mothers who BOTH:
✓ Need special attention
✓ Have blood group A+
```

---

## Mobile/Responsive View

On smaller screens, the filter grid adapts:

```
Desktop (4 columns):
┌─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │
└─────┴─────┴─────┴─────┘

Tablet (2 columns):
┌─────┬─────┐
│  1  │  2  │
├─────┼─────┤
│  3  │  4  │
└─────┴─────┘

Mobile (1 column):
┌─────┐
│  1  │
├─────┤
│  2  │
├─────┤
│  3  │
├─────┤
│  4  │
└─────┘
```

Where:
1. Care plan
2. Filter by midwife (admin only)
3. Account status
4. Blood group

---

## Clear Filters Button

When any filter is active, a "Clear Filters" button appears:

```
                              ┌──────────────────┐
                              │ Clear Filters    │
                              └──────────────────┘
```

Clicking it resets:
- Care plan → (no selection)
- Midwife → (no selection)
- Account status → "all"
- Blood group → (no selection)
- Search term → ""

---

## User Flow

1. **User opens Mothers Management page**
   - All filters show placeholders
   - All mothers are displayed

2. **User clicks "Care plan" dropdown**
   - Sees 2 options: "Normal Care" and "Special Attention"
   
3. **User selects "Special Attention"**
   - Dropdown shows "Special Attention"
   - Table instantly updates to show only special attention cases
   - "Clear Filters" button appears

4. **User adds blood group filter**
   - Both filters now active
   - Table shows mothers matching BOTH criteria

5. **User clicks "Clear Filters"**
   - All filters reset
   - All mothers displayed again
