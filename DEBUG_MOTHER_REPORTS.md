# Debug Guide for Mother Reports Page

## Steps to Debug

### 1. Check if Page Loads
- Navigate to `/mother/reports`
- Does the page appear? ✓ / ✗

### 2. Check Browser Console
- Press F12 to open Developer Tools
- Go to "Console" tab
- Look for RED error messages
- Copy any errors you see here:

```
[Paste errors here]
```

### 3. Check Network Tab
- In Developer Tools, go to "Network" tab
- Click "Generate & Download Report"
- Look for a request to `/api/reports/mother/health` (or appointments/documents)
- What is the status code? (200, 401, 404, 500?)
- Click on the request and check "Response" tab
- Copy response here:

```
[Paste response here]
```

### 4. Check if You're Logged In as Mother
- Open Developer Tools Console
- Type this and press Enter:
```javascript
console.log(document.cookie)
```
- Do you see session cookies? ✓ / ✗

### 5. Test API Directly
- Open a new tab
- Try accessing: `http://localhost:3000/api/reports/mother/health`
- What happens? (Error? Login page? Something else?)

### 6. Check Server Console
- Look at your terminal where `npm run dev` is running
- Are there any error messages when you click the button?
- Copy server errors here:

```
[Paste server errors here]
```

## Common Issues & Solutions

### Issue 1: Page Shows 404
**Solution**: The route might not be set up correctly
- Check if file exists at: `src/app/(dashboard)/mother/reports/page.tsx`

### Issue 2: "Unauthorized" Error
**Solution**: Session issue
- Make sure you're logged in as a MOTHER user (not Admin or Midwife)
- Check if motherId is set in your session

### Issue 3: Button Doesn't Respond
**Solution**: JavaScript error
- Check console for errors
- Might be a component import issue

### Issue 4: PDF Doesn't Generate
**Solution**: API error
- Check if jsPDF is installed: `npm list jspdf`
- Check server console for errors

### Issue 5: TypeScript Errors
**Solution**: Type mismatch
- Run `npm run build` to see TypeScript errors
- Fix any type issues

## Quick Test

Run this in browser console when on `/mother/reports`:

```javascript
fetch('/api/reports/mother/health', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ range: 'all' })
})
.then(r => r.ok ? 'SUCCESS!' : `ERROR: ${r.status}`)
.then(console.log)
.catch(console.error)
```

If this returns "SUCCESS!" then the API works and the issue is in the frontend.
If it returns an error, then the API has a problem.
