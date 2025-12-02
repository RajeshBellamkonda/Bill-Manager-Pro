# Bill Manager Pro 💰

A powerful, privacy-focused bill management web application that runs entirely in your browser with offline support.

## Features

### 📋 Bill Management
- **Add Bills**: Enter bills with name, amount, due date, frequency, category, and notes
- **Edit Bills**: Modify existing bills including changing dates and amounts
- **Mark as Paid**: Check off bills when paid, track payment status
- **Delete Bills**: Remove bills you no longer need
- **Recurring Frequencies**: Support for one-time, weekly, bi-weekly, monthly, quarterly, and yearly bills

### 📅 Timeline View
- **Monthly View**: See all bills organized by month
- **Visual Status**: Color-coded cards show paid, pending, upcoming, and overdue bills
- **Navigation**: Easy month-by-month navigation with Previous/Next buttons
- **Sorted by Date**: Bills automatically ordered by due date

### 🔔 Smart Notifications
- **Reminder System**: Get notified X days before bills are due (customizable per bill)
- **Due Today Alerts**: Special notifications for bills due today
- **Overdue Warnings**: Alerts for bills that are past due
- **Recurring Checks**: Automatic hourly checks for upcoming bills
- **Daily Schedule**: Daily check at 9 AM for bill reminders

### 📑 Bill Templates
- **Create Templates**: Save current bills as reusable templates
- **Apply to Month**: Copy template bills to any specific month
- **Apply to Full Year**: Automatically create bills for all 12 months
- **Smart Duplication**: Prevents duplicate bills when applying templates
- **Template Management**: View, edit, and delete saved templates

### 📊 Analytics & Reports
- **Spending Stats**: Current month, last month, and average monthly totals
- **Spending Trend**: Visual chart showing 6-month spending history
- **Category Breakdown**: Pie chart showing spending by category
- **Detailed Reports**: Table view with monthly breakdowns
- **Bill Counts**: Track total bills, paid vs pending

### 💾 Data Storage
- **IndexedDB**: All data stored locally in your browser
- **No Server Required**: Complete privacy, no data sent anywhere
- **Offline Support**: Works without internet connection
- **Fast Performance**: Instant data access and updates

## Getting Started

### Installation

1. **Download the files** or clone this repository
2. **Open `index.html`** in a modern web browser (Chrome, Firefox, Edge, or Safari)
3. That's it! No installation or setup required

### First Time Setup

1. **Enable Notifications** (Optional but recommended)
   - Click the "Enable Notifications" button in the header
   - Allow notification permissions when prompted
   - You'll receive reminders for upcoming bills

2. **Add Your First Bill**
   - Click the "Add Bill" tab
   - Fill in the bill details:
     - Name (e.g., "Electric Bill")
     - Amount (e.g., 125.50)
     - Due Date
     - Frequency (Monthly, Yearly, etc.)
     - Category (e.g., "Utilities")
     - Reminder days before due (default: 3)
   - Click "Save Bill"

3. **View Your Bills**
   - Go to the "Timeline" tab
   - Navigate between months using Previous/Next buttons
   - See all bills for each month ordered by date

## How to Use

### Managing Bills

**Add a Bill:**
1. Go to "Add Bill" tab
2. Fill out the form
3. Click "Save Bill"

**Edit a Bill:**
1. Find the bill in the Timeline view
2. Click "Edit" button
3. Modify the details
4. Click "Save Bill"

**Mark as Paid:**
1. Find the bill in the Timeline
2. Click "✓ Mark as Paid" button
3. Bill will be marked with a green checkmark

**Change Bill Date:**
1. Edit the bill
2. Select a new due date
3. Save changes

### Using Templates

**Create a Template:**
1. Add all your regular bills for one month
2. Go to "Templates" tab
3. Click "Create Template from Current Bills"
4. Enter a template name (e.g., "My Monthly Bills")
5. Template is saved!

**Apply Template to a Month:**
1. Go to "Templates" tab
2. Select a template from the dropdown
3. Select a target month
4. Click "Apply to Month"

**Apply Template to Full Year:**
1. Select a template
2. Click "Apply to Full Year"
3. Confirm the action
4. Bills will be created for all 12 months

### Viewing Analytics

1. Go to "Analytics" tab
2. View statistics:
   - Current month spending
   - Last month spending
   - Average monthly spending
   - Total bill count
3. Check the spending trend chart (6 months)
4. View category breakdown pie chart
5. See detailed monthly report table

### Notification Settings

- **Initial Setup**: Click "Enable Notifications" in header
- **Per-Bill Reminders**: Set "Remind me (days before)" when adding/editing a bill
- **Daily Checks**: System automatically checks at 9 AM daily
- **Hourly Checks**: Also checks every hour for upcoming bills

## Tips & Best Practices

### 1. Organize with Categories
Use consistent categories like:
- Utilities (Electric, Water, Gas)
- Housing (Rent, Mortgage, Insurance)
- Subscriptions (Netflix, Spotify)
- Services (Internet, Phone)

### 2. Set Appropriate Reminders
- Bills you might forget: 5-7 days
- Regular bills: 3 days
- Auto-pay bills: 1 day

### 3. Use Templates Effectively
- Create a template after setting up your first month
- Update template when you add new recurring bills
- Use different templates for different scenarios

### 4. Regular Maintenance
- Check off paid bills weekly
- Review overdue bills regularly
- Update bill amounts when they change

### 5. Review Analytics
- Check monthly spending trends
- Identify high-spending categories
- Plan budget based on average monthly total

## Technical Details

### Browser Compatibility
- Chrome 60+
- Firefox 58+
- Safari 12+
- Edge 79+

### Storage
- Uses IndexedDB for local storage
- No size limits (typically several hundred MB available)
- Data persists across browser sessions
- Cleared only if you clear browser data

### Privacy
- **100% Local**: All data stays on your device
- **No Tracking**: No analytics or tracking code
- **No Server**: Doesn't connect to any server
- **No Sign-up**: No accounts or registration required

### Technologies Used
- Vanilla JavaScript (ES6+)
- HTML5
- CSS3
- IndexedDB API
- Notifications API
- Canvas API (for charts)

## Troubleshooting

### Notifications Not Working
1. Check browser notification permissions
2. Make sure you clicked "Enable Notifications"
3. Check browser notification settings (not blocked)
4. Try refreshing the page

### Bills Not Saving
1. Check browser console for errors (F12)
2. Ensure IndexedDB is enabled in browser
3. Check available storage space
4. Try clearing browser cache and reloading

### Charts Not Displaying
1. Ensure you have bills with payment data
2. Canvas must be supported (all modern browsers)
3. Check browser console for errors

### Template Not Applying
1. Ensure template has bills
2. Check target month is selected
3. Bills with same name/date in target month are skipped (no duplicates)

## Data Backup

Since all data is stored locally, consider backing up periodically:

1. **Browser Backup**: Your browser may backup IndexedDB data automatically
2. **Export Feature**: (Future enhancement - manual export/import)
3. **Browser Sync**: Some browsers sync data across devices

## Future Enhancements

Potential features for future versions:
- Export/Import data (JSON, CSV)
- Bill attachments (receipts, PDFs)
- Payment method tracking
- Budget limits and alerts
- Multi-currency support
- Dark mode theme
- Mobile app version

## Hosting on GitHub Pages

You can host this app for free on GitHub Pages and access it from anywhere:

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in (or create an account)
2. Click the **+** icon in the top right and select **New repository**
3. Enter a repository name (e.g., `bill-manager-pro`)
4. Choose **Public** (required for free GitHub Pages)
5. Click **Create repository**

### Step 2: Upload Your Files

**Option A: Using GitHub Web Interface**
1. In your new repository, click **uploading an existing file**
2. Drag and drop all the app files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `database.js`
   - `notifications.js`
   - `charts.js`
   - `manifest.json`
   - `service-worker.js`
   - `pwa-handler.js`
   - `LICENSE`
   - `README.md`
   - Any icon files (if generated)
3. Click **Commit changes**

**Option B: Using Git Command Line**
```powershell
# Navigate to your app folder
cd C:\justeat\Temp\BillManagerPro

# Initialize git repository
git init

# Add all files
git add .

# Commit the files
git commit -m "Initial commit - Bill Manager Pro"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR-USERNAME/bill-manager-pro.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. In your GitHub repository, click **Settings**
2. Scroll down to **Pages** section (left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**
5. Wait 1-2 minutes for deployment

### Step 4: Access Your App

Your app will be available at:
```
https://YOUR-USERNAME.github.io/bill-manager-pro/
```

For example: `https://rajeshbellamkonda.github.io/bill-manager-pro/`

### Step 5: Install as PWA on Mobile

1. Open the GitHub Pages URL on your Android phone (Chrome browser)
2. The app will prompt you to install it
3. Or tap the three dots menu → **Install app**
4. The app will be added to your home screen!

### Updating Your App

Whenever you make changes:

**Using Web Interface:**
1. Go to your repository
2. Click on the file to edit
3. Click the pencil icon (Edit)
4. Make changes and commit

**Using Git:**
```powershell
git add .
git commit -m "Description of changes"
git push
```

Changes will be live in 1-2 minutes!

### Custom Domain (Optional)

1. Buy a domain from any registrar
2. In repository Settings → Pages → Custom domain
3. Enter your domain (e.g., `bills.yourdomain.com`)
4. Configure DNS with your registrar:
   - Add CNAME record pointing to `YOUR-USERNAME.github.io`
5. Enable **Enforce HTTPS**

### Troubleshooting

**Issue: Service Worker not working**
- GitHub Pages uses HTTPS automatically, so PWA features work
- Clear browser cache and reload

**Issue: Icons not showing**
- Make sure all icon files are uploaded
- Check file paths in `manifest.json` are correct
- Use `generate-icons.html` to create missing icons

**Issue: 404 Error**
- Wait 2-3 minutes after enabling Pages
- Check repository is Public
- Verify files are in the root directory (not in a subfolder)

## License

MIT License - Copyright (c) 2025 Rajesh Bellamkonda

See [LICENSE](LICENSE) file for full details. This is open source software, free to use, modify, and distribute.

## Support

This is an open-source project. For issues or questions:
1. Check this README for solutions
2. Review browser console for errors
3. Ensure you're using a modern browser
4. Open an issue on GitHub

## Credits

Developed by **Rajesh Bellamkonda**

---

**Enjoy managing your bills with ease! 💰📊**
