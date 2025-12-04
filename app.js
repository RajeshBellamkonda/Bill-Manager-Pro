// Main Application
class BillManagerApp {
    constructor() {
        this.currentMonth = new Date();
        this.editingBillId = null;
        this.currencySymbol = '£';
    }

    async init() {
        // Initialize database
        await database.init();
        
        // Initialize profiles
        await this.initProfiles();
        
        // Load settings first
        await this.loadSettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadTimeline();
        await this.loadTemplates();
        
        // Setup notifications
        const notificationEnabled = await database.getSetting('notificationsEnabled');
        if (notificationEnabled) {
            notificationManager.startPeriodicCheck();
            notificationManager.scheduleRecurringNotifications();
        }
    }

    async initProfiles() {
        // Check if default profile exists
        const profiles = await database.getAllProfiles();
        
        if (profiles.length === 0) {
            // Create default profile
            await database.createProfile('Default');
        }

        // Load current profile from settings or use first profile
        const savedProfileId = await database.getSetting('currentProfileId');
        const allProfiles = await database.getAllProfiles();
        
        if (savedProfileId && allProfiles.find(p => p.id === savedProfileId)) {
            database.setCurrentProfile(savedProfileId);
        } else {
            database.setCurrentProfile(allProfiles[0].id);
            await database.saveSetting('currentProfileId', allProfiles[0].id);
        }

        await this.loadProfileSelector();
    }

    async loadProfileSelector() {
        const profiles = await database.getAllProfiles();
        const profileSelect = document.getElementById('profileSelect');
        const currentProfileId = database.getCurrentProfile();

        profileSelect.innerHTML = profiles.map(profile => 
            `<option value="${profile.id}" ${profile.id === currentProfileId ? 'selected' : ''}>${profile.name}</option>`
        ).join('');
    }

    async switchProfile(profileId) {
        database.setCurrentProfile(parseInt(profileId));
        await database.saveSetting('currentProfileId', parseInt(profileId));
        
        // Reload all data
        await this.loadTimeline();
        await this.loadTemplates();
        await this.loadProfilesList();
        
        // Update profile name in settings if visible
        const currentTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (currentTab === 'settings') {
            await this.loadSettings();
        } else if (currentTab === 'analytics') {
            await this.loadAnalytics();
        }
    }

    setupEventListeners() {
        // Update header date/time
        this.updateHeaderDateTime();
        setInterval(() => this.updateHeaderDateTime(), 1000);
        
        // Burger menu
        const burgerMenu = document.getElementById('burgerMenu');
        const menuOverlay = document.getElementById('menuOverlay');
        const mainTabs = document.getElementById('mainTabs');
        
        burgerMenu.addEventListener('click', () => {
            burgerMenu.classList.toggle('active');
            mainTabs.classList.toggle('active');
            menuOverlay.classList.toggle('active');
            document.body.style.overflow = mainTabs.classList.contains('active') ? 'hidden' : '';
        });
        
        menuOverlay.addEventListener('click', () => {
            burgerMenu.classList.remove('active');
            mainTabs.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
                // Close mobile menu when tab is selected
                if (window.innerWidth <= 768) {
                    burgerMenu.classList.remove('active');
                    mainTabs.classList.remove('active');
                    menuOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Timeline navigation
        document.getElementById('prevMonth').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.navigateMonth(1));

        // Bill form
        document.getElementById('billForm').addEventListener('submit', (e) => this.saveBill(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());

        // Notifications
        document.getElementById('requestNotificationBtn').addEventListener('click', () => this.enableNotifications());
        document.getElementById('testNotificationBtn').addEventListener('click', () => this.testNotification());
        document.getElementById('checkBillsNotificationBtn').addEventListener('click', () => this.checkBillsNow());

        // Templates
        document.getElementById('createTemplateBtn').addEventListener('click', () => this.createTemplate());
        document.getElementById('applyTemplateBtn').addEventListener('click', () => this.applyTemplate());
        document.getElementById('applyTemplateYearBtn').addEventListener('click', () => this.applyTemplateYear());

        // Settings
        document.getElementById('currencySymbol').addEventListener('change', (e) => this.updateCurrency(e.target.value));
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => this.changeTheme(option.dataset.theme));
        });
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());
        document.getElementById('notificationsEnabled').addEventListener('change', async (e) => {
            if (e.target.checked) {
                await this.enableNotifications();
            }
        });

        // Profile management
        document.getElementById('profileSelect').addEventListener('change', (e) => this.switchProfile(e.target.value));
        document.getElementById('createProfileBtn').addEventListener('click', () => this.createNewProfile());
        document.getElementById('deleteProfileBtn').addEventListener('click', () => this.deleteCurrentProfile());

        // Category management
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.addCategory());
        document.getElementById('resetCategoriesBtn').addEventListener('click', () => this.resetCategories());
        document.getElementById('categoryToggleBtn').addEventListener('click', () => this.toggleCategoryList());
        
        // Header title click to go to Timeline
        document.getElementById('appTitle').addEventListener('click', () => {
            this.switchTab('timeline');
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                const burgerMenu = document.getElementById('burgerMenu');
                const mainTabs = document.getElementById('mainTabs');
                const menuOverlay = document.getElementById('menuOverlay');
                burgerMenu.classList.remove('active');
                mainTabs.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Scroll to top button
        const scrollToTopBtn = document.getElementById('scrollToTopBtn');
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Show/hide scroll to top button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });
        
        // Quick add bill button
        document.getElementById('quickAddBillBtn').addEventListener('click', () => {
            this.switchTab('add-bill');
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                const burgerMenu = document.getElementById('burgerMenu');
                const mainTabs = document.getElementById('mainTabs');
                const menuOverlay = document.getElementById('menuOverlay');
                burgerMenu.classList.remove('active');
                mainTabs.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        // Data export/import
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput').addEventListener('change', (e) => this.importData(e));
        
        // Quick add category in bill form
        document.getElementById('addNewCategoryBtn').addEventListener('click', () => this.showNewCategoryInput());
        document.getElementById('saveNewCategoryBtn').addEventListener('click', () => this.saveNewCategoryFromForm());
        document.getElementById('cancelNewCategoryBtn').addEventListener('click', () => this.hideNewCategoryInput());
        
        // Quick add currency in settings
        document.getElementById('addNewCurrencyBtn').addEventListener('click', () => this.showNewCurrencyInput());
        document.getElementById('saveNewCurrencyBtn').addEventListener('click', () => this.saveNewCurrency());
        document.getElementById('cancelNewCurrencyBtn').addEventListener('click', () => this.hideNewCurrencyInput());
        
        // Delete all data
        document.getElementById('deleteAllDataBtn').addEventListener('click', () => this.deleteAllData());
        
        // Monthly credit
        document.getElementById('saveCreditBtn').addEventListener('click', () => this.saveMonthlyCredit());
        document.getElementById('monthlyCredit').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveMonthlyCredit();
            }
        });
        
        // Toggle balances section
        document.getElementById('toggleBalancesBtn').addEventListener('click', () => this.toggleBalances());
    }

    toggleCategoryList() {
        const toggleBtn = document.getElementById('categoryToggleBtn');
        const categoryList = document.getElementById('categoryListContainer');
        
        toggleBtn.classList.toggle('active');
        categoryList.classList.toggle('collapsed');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Load data for specific tabs
        if (tabName === 'timeline') {
            this.loadTimeline();
        } else if (tabName === 'add-bill') {
            this.loadCategoryDropdown();
        } else if (tabName === 'templates') {
            this.loadTemplates();
        } else if (tabName === 'analytics') {
            this.loadAnalytics();
        } else if (tabName === 'settings') {
            this.loadSettings();
        }
    }

    navigateMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.loadTimeline();
    }

    async loadTimeline() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Update header
        document.getElementById('currentMonth').textContent = 
            this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Load monthly credit (profile-specific)
        const profileId = database.getCurrentProfile();
        const creditKey = `monthlyCredit_${profileId}_${year}_${month}`;
        const savedCredit = await database.getSetting(creditKey);
        document.getElementById('monthlyCredit').value = savedCredit || '';

        // Get bills for this month
        const bills = await database.getBillsByMonth(year, month);
        
        // Calculate unpaid total (expenses minus credits)
        const unpaidBillsList = bills.filter(bill => !bill.isPaid);
        const unpaidTotal = unpaidBillsList.reduce((sum, bill) => {
            const amount = typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0;
            const isCredit = bill.isCredit || false;
            // Credits reduce the total, expenses increase it
            return sum + (isCredit ? -amount : amount);
        }, 0);
        
        // Update unpaid total display
        const unpaidTotalEl = document.getElementById('unpaidTotal');
        if (unpaidBillsList.length > 0) {
            unpaidTotalEl.textContent = `Unpaid: ${this.currencySymbol}${unpaidTotal.toFixed(2)}`;
            unpaidTotalEl.style.display = 'block';
        } else {
            unpaidTotalEl.style.display = 'none';
        }
        
        // Calculate and display balance difference
        const credit = parseFloat(savedCredit) || 0;
        const balanceDiffEl = document.getElementById('balanceDifference');
        const creditCoverageEl = document.getElementById('creditCoverage');
        
        if (credit > 0 || unpaidTotal > 0) {
            const difference = credit - unpaidTotal;
            balanceDiffEl.style.display = 'block';
            
            if (difference >= 0) {
                balanceDiffEl.innerHTML = `<span class="balance-surplus">Balance: +${this.currencySymbol}${difference.toFixed(2)}</span>`;
            } else {
                balanceDiffEl.innerHTML = `<span class="balance-deficit">Balance: ${this.currencySymbol}${difference.toFixed(2)}</span>`;
            }
            
            // Calculate credit coverage - how far credit can cover unpaid bills
            if (credit > 0 && unpaidBillsList.length > 0) {
                // Sort unpaid bills by due date
                const sortedUnpaidBills = unpaidBillsList.sort((a, b) => 
                    new Date(a.dueDate) - new Date(b.dueDate)
                );
                
                let remainingCredit = credit;
                let coveredUntilDate = null;
                let billsCovered = 0;
                
                for (const bill of sortedUnpaidBills) {
                    const billAmount = typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0;
                    const isCredit = bill.isCredit || false;
                    
                    if (isCredit) {
                        // Credits add to available balance
                        remainingCredit += billAmount;
                        coveredUntilDate = new Date(bill.dueDate);
                        billsCovered++;
                    } else if (remainingCredit >= billAmount) {
                        // Expenses subtract from available balance
                        remainingCredit -= billAmount;
                        coveredUntilDate = new Date(bill.dueDate);
                        billsCovered++;
                    } else {
                        break;
                    }
                }
                
                if (coveredUntilDate) {
                    const coverageText = coveredUntilDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: coveredUntilDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    });
                    creditCoverageEl.innerHTML = `<span class="credit-coverage-info">💰 Credit covers ${billsCovered} bill${billsCovered > 1 ? 's' : ''} until ${coverageText}</span>`;
                    creditCoverageEl.style.display = 'block';
                } else {
                    creditCoverageEl.innerHTML = `<span class="credit-coverage-info credit-insufficient">⚠️ Credit insufficient to cover any bills</span>`;
                    creditCoverageEl.style.display = 'block';
                }
            } else if (credit > 0 && unpaidBillsList.length === 0) {
                creditCoverageEl.innerHTML = `<span class="credit-coverage-info">✅ No unpaid bills to cover</span>`;
                creditCoverageEl.style.display = 'block';
            } else {
                creditCoverageEl.style.display = 'none';
            }
        } else {
            balanceDiffEl.style.display = 'none';
            creditCoverageEl.style.display = 'none';
        }
        
        const timeline = document.getElementById('billsTimeline');
        
        if (bills.length === 0) {
            timeline.innerHTML = `
                <div class="empty-state">
                    <h3>No bills for this month</h3>
                    <p>Add a bill or apply a template to get started</p>
                </div>
            `;
            return;
        }

        // Separate paid and unpaid bills
        const paidBills = bills.filter(b => b.isPaid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const unpaidBills = bills.filter(b => !b.isPaid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        // Calculate paid bills total (expenses minus credits)
        const paidTotal = paidBills.reduce((sum, bill) => {
            const amount = typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0;
            const isCredit = bill.isCredit || false;
            return sum + (isCredit ? -amount : amount);
        }, 0);

        let remainingCredit = credit;
        let html = '';
        
        // Add collapsed paid bills section first
        if (paidBills.length > 0) {
            const totalLabel = paidTotal >= 0 ? `${this.currencySymbol}${paidTotal.toFixed(2)}` : `-${this.currencySymbol}${Math.abs(paidTotal).toFixed(2)}`;
            html += `
                <div class="paid-bills-section">
                    <div class="paid-bills-header" onclick="app.togglePaidBills()">
                        <div class="paid-bills-summary">
                            <span class="paid-bills-icon">✅</span>
                            <span class="paid-bills-title">Paid Bills (${paidBills.length})</span>
                            <span class="paid-bills-total">${totalLabel}</span>
                        </div>
                        <span class="paid-bills-toggle" id="paidBillsToggle">▼</span>
                    </div>
                    <div class="paid-bills-content collapsed" id="paidBillsContent">
                        ${paidBills.map(bill => this.createBillCard(bill, 0)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Add unpaid bills after
        unpaidBills.forEach(bill => {
            html += this.createBillCard(bill, remainingCredit);
            const billAmount = typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0;
            const isCredit = bill.isCredit || false;
            // Credits add to remaining credit, expenses subtract from it
            remainingCredit = isCredit ? remainingCredit + billAmount : Math.max(0, remainingCredit - billAmount);
        });
        
        timeline.innerHTML = html;
    }

    togglePaidBills() {
        const content = document.getElementById('paidBillsContent');
        const toggle = document.getElementById('paidBillsToggle');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            toggle.textContent = '▲';
        } else {
            content.classList.add('collapsed');
            content.classList.remove('expanded');
            toggle.textContent = '▼';
        }
    }

    createBillCard(bill, creditBeforeThisBill = 0) {
        // Ensure amount is a number (defensive coding for any legacy data)
        const amount = typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0;
        const isCredit = bill.isCredit || false;
        
        const dueDate = new Date(bill.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        let statusClass = '';
        let statusBadge = '';
        
        // Calculate credit balance for unpaid bills (only for expenses, not credits)
        let creditBalanceBadge = '';
        if (!bill.isPaid && !isCredit && creditBeforeThisBill > 0) {
            const creditAfter = creditBeforeThisBill - amount;
            if (creditAfter >= 0) {
                creditBalanceBadge = `<span class="credit-balance-badge credit-sufficient">💰 Credit: ${this.currencySymbol}${creditAfter.toFixed(2)}</span>`;
            } else {
                creditBalanceBadge = `<span class="credit-balance-badge credit-insufficient">⚠️ Short: ${this.currencySymbol}${Math.abs(creditAfter).toFixed(2)}</span>`;
            }
        }
        
        // Add credit indicator badge
        if (isCredit) {
            statusClass = 'credit-bill';
        }
        
        if (bill.isPaid) {
            statusClass = 'paid';
            statusBadge = '<span class="status-badge status-paid">✓ Paid</span>';
        } else if (daysUntilDue < 0) {
            statusClass = 'overdue';
            statusBadge = '<span class="status-badge status-overdue">⚠ Overdue</span>';
        } else if (daysUntilDue === 0) {
            statusClass = 'upcoming';
            statusBadge = '<span class="status-badge status-pending">🔔 Due Today</span>';
        } else if (daysUntilDue <= 3) {
            statusClass = 'upcoming';
            statusBadge = '<span class="status-badge status-pending">⏰ Upcoming</span>';
        } else {
            statusBadge = '<span class="status-badge status-pending">📅 Pending</span>';
        }

        const frequencyIcon = {
            'once': '🎯',
            'weekly': '📅',
            'bi-weekly': '📆',
            'monthly': '🗓️',
            'quarterly': '📊',
            'yearly': '🎂'
        }[bill.frequency] || '🔄';

        return `
            <div class="bill-card ${statusClass}" ${bill.isPaid ? `onclick="app.togglePaidBill(event, ${bill.id})"` : ''}>
                <div class="bill-card-row bill-header-row">
                    <div class="bill-info-left">
                        <div class="bill-name">${bill.name}</div>
                        <div class="bill-meta">
                            <span class="bill-meta-item"><span class="meta-icon">📅</span>${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span class="bill-meta-item"><span class="meta-icon">${frequencyIcon}</span>${this.formatFrequency(bill.frequency)}</span>
                            ${bill.category ? `<span class="bill-meta-item"><span class="meta-icon">📁</span>${bill.category}</span>` : ''}
                            ${bill.notes ? `<span class="bill-meta-item bill-notes-icon" onclick="event.stopPropagation(); app.showNotesPopup('${bill.notes.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n')}', '${bill.name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"><span class="meta-icon">📝</span>Notes</span>` : ''}
                            ${creditBalanceBadge}
                            </div>
                        ${bill.notes ? `<div class="bill-notes-preview"><span class="meta-icon">📝</span>${bill.notes}</div>` : ''}
                    </div>
                    <div class="bill-amount-section">
                        <div class="bill-amount ${isCredit ? 'credit-amount' : ''}">${isCredit ? '+' : ''}${this.currencySymbol}${amount.toFixed(2)}</div>
                        ${isCredit ? '<span class="status-badge status-credit">💵 Credit</span>' : statusBadge}
                    </div>
                </div>
                <div class="bill-card-row bill-actions-row">
                    ${!bill.isPaid ? `
                        <button class="btn-action btn-action-success" onclick="app.markAsPaid(${bill.id})" title="Mark as Paid">
                            <span class="btn-icon">✓</span>
                            <span class="btn-label">Paid</span>
                        </button>
                    ` : `
                        <button class="btn-action btn-action-secondary" onclick="event.stopPropagation(); app.markAsUnpaid(${bill.id})" title="Mark as Unpaid">
                            <span class="btn-icon">↺</span>
                            <span class="btn-label">Undo</span>
                        </button>
                    `}
                    <button class="btn-action btn-action-secondary" onclick="event.stopPropagation(); app.editBill(${bill.id})" title="Edit">
                        <span class="btn-icon">✏️</span>
                        <span class="btn-label">Edit</span>
                    </button>
                    <button class="btn-action btn-action-danger" onclick="event.stopPropagation(); app.deleteBill(${bill.id})" title="Delete">
                        <span class="btn-icon">🗑️</span>
                        <span class="btn-label">Delete</span>
                    </button>
                </div>
            </div>
        `;
    }

    togglePaidBill(event, billId) {
        // Don't toggle if clicking on a button
        if (event.target.tagName === 'BUTTON') {
            return;
        }
        
        const billCard = event.currentTarget;
        billCard.classList.toggle('expanded');
    }

    formatFrequency(frequency) {
        const map = {
            'once': 'One-time',
            'weekly': 'Weekly',
            'bi-weekly': 'Bi-weekly',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly',
            'yearly': 'Yearly'
        };
        return map[frequency] || frequency;
    }

    async saveBill(e) {
        e.preventDefault();
        
        const billData = {
            name: document.getElementById('billName').value,
            amount: parseFloat(document.getElementById('billAmount').value),
            dueDate: document.getElementById('billDate').value,
            frequency: document.getElementById('billFrequency').value,
            category: document.getElementById('billCategory').value,
            notes: document.getElementById('billNotes').value,
            reminderDays: parseInt(document.getElementById('reminderDays').value) || 3,
            isCredit: document.getElementById('isCredit').checked || false
        };

        try {
            if (this.editingBillId) {
                await database.updateBill(this.editingBillId, billData);
                this.editingBillId = null;
            } else {
                await database.addBill(billData);
            }

            // Reset form
            document.getElementById('billForm').reset();
            document.getElementById('billId').value = '';
            document.getElementById('formTitle').textContent = 'Add New Bill';
            
            // Switch to timeline and reload
            this.switchTab('timeline');
            await this.loadTimeline();
            
            alert('Bill saved successfully!');
        } catch (error) {
            console.error('Error saving bill:', error);
            alert('Error saving bill. Please try again.');
        }
    }

    async editBill(id) {
        try {
            const bill = await database.getBillById(id);
            if (!bill) return;

            this.editingBillId = id;
            
            // Ensure categories are loaded first
            await this.loadCategoryDropdown();
            
            // Fill form
            document.getElementById('billName').value = bill.name;
            document.getElementById('billAmount').value = bill.amount;
            document.getElementById('billDate').value = bill.dueDate;
            document.getElementById('billFrequency').value = bill.frequency;
            document.getElementById('billCategory').value = bill.category;
            document.getElementById('billNotes').value = bill.notes;
            document.getElementById('reminderDays').value = bill.reminderDays;
            document.getElementById('isCredit').checked = bill.isCredit || false;
            document.getElementById('formTitle').textContent = 'Edit Bill';
            
            // Switch to form tab
            this.switchTab('add-bill');
        } catch (error) {
            console.error('Error loading bill:', error);
            alert('Error loading bill. Please try again.');
        }
    }

    cancelEdit() {
        this.editingBillId = null;
        document.getElementById('billForm').reset();
        document.getElementById('formTitle').textContent = 'Add New Bill';
        this.switchTab('timeline');
    }

    async deleteBill(id) {
        if (!confirm('Are you sure you want to delete this bill?')) return;

        try {
            await database.deleteBill(id);
            await this.loadTimeline();
        } catch (error) {
            console.error('Error deleting bill:', error);
            alert('Error deleting bill. Please try again.');
        }
    }

    async markAsPaid(id) {
        try {
            await database.markBillAsPaid(id, true);
            await this.loadTimeline();
        } catch (error) {
            console.error('Error marking bill as paid:', error);
            alert('Error updating bill. Please try again.');
        }
    }

    async markAsUnpaid(id) {
        try {
            await database.markBillAsPaid(id, false);
            await this.loadTimeline();
        } catch (error) {
            console.error('Error marking bill as unpaid:', error);
            alert('Error updating bill. Please try again.');
        }
    }

    async enableNotifications() {
        // Block iOS devices completely
        if (this.isIOSDevice()) {
            alert('⚠️ iOS Safari does not support web notifications.\n\nInstall this app to your home screen for notification support.');
            this.updateNotificationStatus();
            return;
        }
        
        // Warn non-Chrome mobile browsers
        if (this.isMobileBrowser() && !this.isAndroidChrome()) {
            const proceed = confirm('⚠️ This mobile browser may have limited notification support.\n\nFor best results, use Chrome on Android or install as PWA.\n\nDo you want to continue anyway?');
            if (!proceed) {
                this.updateNotificationStatus();
                return;
            }
        }

        const granted = await notificationManager.requestPermission();
        if (granted) {
            await database.saveSetting('notificationsEnabled', true);
            notificationManager.startPeriodicCheck();
            notificationManager.scheduleRecurringNotifications();
            this.updateNotificationStatus();
            alert('Notifications enabled! You will receive reminders for upcoming bills.');
        } else {
            this.updateNotificationStatus();
            alert('Notification permission denied. Please enable it in your browser settings.');
        }
    }

    isMobileBrowser() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    isAndroidChrome() {
        const ua = navigator.userAgent;
        return /Android/i.test(ua) && /Chrome/i.test(ua) && !/Edge|Edg/i.test(ua);
    }

    isIOSDevice() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    updateNotificationStatus() {
        const statusText = document.getElementById('notificationPermissionText');
        const notificationsEnabled = document.getElementById('notificationsEnabled').checked;
        
        if (!('Notification' in window)) {
            statusText.innerHTML = '❌ Status: <span style="color: var(--danger-color);">Not supported by browser</span>';
            return;
        }

        // Check if iOS device
        if (this.isIOSDevice()) {
            statusText.innerHTML = '⚠️ Status: <span style="color: #FF9800;">iOS Safari doesn\'t support web notifications. Install this app to home screen for alerts.</span>';
            return;
        }
        
        // Show info for non-Chrome mobile browsers
        if (this.isMobileBrowser() && !this.isAndroidChrome()) {
            statusText.innerHTML = '⚠️ Status: <span style="color: #FF9800;">Limited browser support. Use Chrome on Android for best results.</span>';
            return;
        }

        const permission = Notification.permission;
        if (permission === 'granted' && notificationsEnabled) {
            statusText.innerHTML = '✅ Status: <span style="color: var(--success-color);">Active</span>';
        } else if (permission === 'granted') {
            statusText.innerHTML = '⚠️ Status: <span style="color: #FF9800;">Granted but disabled</span>';
        } else if (permission === 'denied') {
            statusText.innerHTML = '❌ Status: <span style="color: var(--danger-color);">Blocked - Check browser settings</span>';
        } else {
            statusText.innerHTML = '⏸️ Status: <span style="color: var(--text-secondary);">Not requested</span>';
        }
    }

    async testNotification() {
        console.log('Test notification clicked');
        
        if (!('Notification' in window)) {
            alert('Your browser does not support notifications.');
            return;
        }

        // Block iOS devices
        if (this.isIOSDevice()) {
            alert('⚠️ iOS Safari does not support web push notifications.\n\nTo receive notifications:\n1. Tap the Share button\n2. Select "Add to Home Screen"\n3. Open the app from your home screen\n\nThis installs it as a Progressive Web App with notification support.');
            return;
        }
        
        // Warn non-Chrome mobile browsers but allow them to try
        if (this.isMobileBrowser() && !this.isAndroidChrome()) {
            alert('⚠️ This mobile browser may have limited notification support.\n\nFor best experience:\n1. Use Chrome on Android\n2. Grant notification permissions when prompted\n3. Or install as PWA (Add to Home Screen)');
            // Don't return - let them try
        }

        const granted = await notificationManager.requestPermission();
        console.log('Permission granted:', granted);
        
        if (granted) {
            const notification = notificationManager.showNotification('Test Notification 🔔', {
                body: 'If you can see this, notifications are working correctly!',
                icon: 'icon-192.png',
                tag: 'test-notification',
                requireInteraction: false
            });
            
            if (notification) {
                console.log('Test notification sent successfully');
                alert('Test notification sent! Check your system notifications.');
            } else {
                console.error('Failed to create notification');
                alert('Failed to send notification. Check console for errors.');
            }
            
            this.updateNotificationStatus();
        } else {
            const permission = Notification.permission;
            if (permission === 'denied') {
                alert('Notifications are blocked. Please enable them in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Find Notifications\n3. Change to "Allow"\n4. Refresh the page');
            } else {
                alert('Please allow notifications when prompted by your browser.');
            }
            this.updateNotificationStatus();
        }
    }

    async checkBillsNow() {
        const granted = await notificationManager.requestPermission();
        if (!granted) {
            alert('Please allow notifications in your browser settings first.');
            return;
        }

        const result = await notificationManager.checkUpcomingBills();
        this.updateNotificationStatus();
        
        if (result === 0) {
            alert('No upcoming bills require notifications at this time.');
        } else {
            alert(`Checked bills! Found ${result} notification(s) to send.`);
        }
    }

    async createTemplate() {
        const templateName = prompt('Enter a name for this template:');
        if (!templateName) return;

        try {
            const bills = await database.getAllBills();
            if (bills.length === 0) {
                alert('No bills to create a template from. Add some bills first.');
                return;
            }

            await database.saveTemplate(templateName, bills);
            await this.loadTemplates();
            alert('Template created successfully!');
        } catch (error) {
            console.error('Error creating template:', error);
            alert('Error creating template. Please try again.');
        }
    }

    async loadTemplates() {
        const templates = await database.getAllTemplates();
        const templatesList = document.getElementById('templatesList');
        const templateSelect = document.getElementById('templateSelect');

        if (templates.length === 0) {
            templatesList.innerHTML = `
                <div class="empty-state">
                    <h3>No templates yet</h3>
                    <p>Create a template from your current bills to reuse them</p>
                </div>
            `;
            templateSelect.innerHTML = '<option value="">No templates available</option>';
            return;
        }

        // Update list
        templatesList.innerHTML = templates.map(template => `
            <div class="template-card">
                <div class="template-header">
                    <div>
                        <div class="template-name">${template.name}</div>
                        <div class="template-bills">${template.bills.length} bills</div>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="app.deleteTemplate(${template.id})">Delete</button>
                </div>
                <div class="template-bills">
                    ${template.bills.map(b => `<div>• ${b.name} - ${this.currencySymbol}${b.amount.toFixed(2)}</div>`).join('')}
                </div>
            </div>
        `).join('');

        // Update select
        templateSelect.innerHTML = '<option value="">Select a template</option>' + 
            templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

        // Update month select
        const targetMonth = document.getElementById('targetMonth');
        const months = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            months.push({
                value: `${date.getFullYear()}-${date.getMonth()}`,
                label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            });
        }
        targetMonth.innerHTML = '<option value="">Select target month</option>' +
            months.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
    }

    async deleteTemplate(id) {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await database.deleteTemplate(id);
            await this.loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Error deleting template. Please try again.');
        }
    }

    async applyTemplate() {
        const templateId = parseInt(document.getElementById('templateSelect').value);
        const targetMonth = document.getElementById('targetMonth').value;

        if (!templateId || !targetMonth) {
            alert('Please select both a template and target month');
            return;
        }

        try {
            const [year, month] = targetMonth.split('-').map(Number);
            const added = await database.applyTemplateToMonth(templateId, year, month);
            
            alert(`Template applied! ${added.length} bill(s) added to ${new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
            this.switchTab('timeline');
        } catch (error) {
            console.error('Error applying template:', error);
            alert('Error applying template. Please try again.');
        }
    }

    async applyTemplateYear() {
        const templateId = parseInt(document.getElementById('templateSelect').value);

        if (!templateId) {
            alert('Please select a template');
            return;
        }

        if (!confirm('This will apply the template to all 12 months of the current year. Continue?')) {
            return;
        }

        try {
            const year = new Date().getFullYear();
            const results = await database.applyTemplateToYear(templateId, year);
            
            const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
            alert(`Template applied to full year! ${totalAdded} bill(s) added across 12 months`);
            this.switchTab('timeline');
        } catch (error) {
            console.error('Error applying template:', error);
            alert('Error applying template. Please try again.');
        }
    }

    async loadAnalytics() {
        // Initialize analytics filters state
        if (!this.analyticsFilters) {
            this.analyticsFilters = {
                timeRange: 'current',
                category: 'all',
                status: 'all',
                selectedMonth: null
            };
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Load category filter dropdown
        await this.loadAnalyticsCategoryFilter();

        // Setup filter event listeners
        this.setupAnalyticsFilters();

        // Update stat cards
        await this.updateAnalyticsStats();

        // Update charts with filters
        await chartManager.updateAllCharts(this.analyticsFilters);

        // Update detailed report
        await this.updateDetailedReport();
    }

    async loadAnalyticsCategoryFilter() {
        const categories = await database.getCategories();
        const categoryFilter = document.getElementById('analyticsCategoryFilter');
        
        categoryFilter.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
        // Restore selected category if any
        if (this.analyticsFilters.category !== 'all') {
            categoryFilter.value = this.analyticsFilters.category;
        }
    }

    setupAnalyticsFilters() {
        const timeRangeSelect = document.getElementById('analyticsTimeRange');
        const categoryFilter = document.getElementById('analyticsCategoryFilter');
        const statusFilter = document.getElementById('analyticsStatusFilter');
        const resetBtn = document.getElementById('analyticsResetBtn');

        // Remove old listeners if any
        timeRangeSelect.replaceWith(timeRangeSelect.cloneNode(true));
        categoryFilter.replaceWith(categoryFilter.cloneNode(true));
        statusFilter.replaceWith(statusFilter.cloneNode(true));
        resetBtn.replaceWith(resetBtn.cloneNode(true));

        // Get fresh references
        const timeRange = document.getElementById('analyticsTimeRange');
        const category = document.getElementById('analyticsCategoryFilter');
        const status = document.getElementById('analyticsStatusFilter');
        const reset = document.getElementById('analyticsResetBtn');

        timeRange.addEventListener('change', async (e) => {
            const value = e.target.value;
            if (value === 'all' || value === 'current') {
                this.analyticsFilters.timeRange = value;
            } else {
                this.analyticsFilters.timeRange = parseInt(value);
            }
            this.analyticsFilters.selectedMonth = null; // Reset month selection
            await this.refreshAnalytics();
        });

        category.addEventListener('change', async (e) => {
            this.analyticsFilters.category = e.target.value;
            await this.refreshAnalytics();
        });

        status.addEventListener('change', async (e) => {
            this.analyticsFilters.status = e.target.value;
            await this.refreshAnalytics();
        });

        reset.addEventListener('click', async () => {
            this.analyticsFilters = {
                timeRange: 'current',
                category: 'all',
                status: 'all',
                selectedMonth: null
            };
            timeRange.value = 'current';
            category.value = 'all';
            status.value = 'all';
            await this.refreshAnalytics();
        });
    }

    async updateAnalyticsStats() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const currentMonthTotal = await database.getMonthlySpending(currentYear, currentMonth);
        const lastMonthTotal = await database.getMonthlySpending(
            currentMonth === 0 ? currentYear - 1 : currentYear,
            currentMonth === 0 ? 11 : currentMonth - 1
        );

        const trendData = await database.getSpendingTrend(12);
        const avgMonthly = trendData.length > 0 ? trendData.reduce((sum, d) => sum + d.amount, 0) / trendData.length : 0;

        const allBills = await database.getAllBills();

        document.getElementById('currentMonthTotal').textContent = `${this.currencySymbol}${currentMonthTotal.toFixed(2)}`;
        document.getElementById('lastMonthTotal').textContent = `${this.currencySymbol}${lastMonthTotal.toFixed(2)}`;
        document.getElementById('avgMonthlyTotal').textContent = `${this.currencySymbol}${avgMonthly.toFixed(2)}`;
        document.getElementById('totalBills').textContent = allBills.length;
    }

    async refreshAnalytics() {
        await chartManager.updateAllCharts(this.analyticsFilters);
        await this.updateDetailedReport();
        await this.updateCategoryBillsList();
        this.updateActiveFiltersDisplay();
    }

    updateActiveFiltersDisplay() {
        const display = document.getElementById('activeFiltersDisplay');
        const filters = [];

        if (this.analyticsFilters.selectedMonth) {
            filters.push(`📅 ${this.analyticsFilters.selectedMonth}`);
        } else {
            const timeRange = this.analyticsFilters.timeRange;
            if (timeRange === 'current') {
                filters.push(`📅 Current Month`);
            } else if (timeRange !== 'all') {
                filters.push(`📊 Last ${timeRange} months`);
            }
        }

        if (this.analyticsFilters.category !== 'all') {
            filters.push(`📁 ${this.analyticsFilters.category}`);
        }

        if (this.analyticsFilters.status !== 'all') {
            const statusLabel = this.analyticsFilters.status === 'paid' ? '✅ Paid Only' : '⏳ Unpaid Only';
            filters.push(statusLabel);
        }

        if (filters.length > 0) {
            display.innerHTML = `<span class="filter-tag">Active Filters: ${filters.join(' • ')}</span>`;
            display.style.display = 'block';
        } else {
            display.style.display = 'none';
        }
    }

    async updateDetailedReport() {
        let bills = await database.getAllBills();
        const reportDiv = document.getElementById('detailedReport');

        // Apply category filter
        if (this.analyticsFilters.category !== 'all') {
            bills = bills.filter(b => b.category === this.analyticsFilters.category);
        }

        // Apply status filter
        if (this.analyticsFilters.status === 'paid') {
            bills = bills.filter(b => b.isPaid === true);
        } else if (this.analyticsFilters.status === 'unpaid') {
            bills = bills.filter(b => b.isPaid === false);
        }

        // Apply time range filter
        if (this.analyticsFilters.selectedMonth) {
            // Specific month selected from chart click
            bills = bills.filter(b => {
                const date = new Date(b.dueDate);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return this.analyticsFilters.selectedMonth === key;
            });
        } else if (this.analyticsFilters.timeRange === 'current') {
            // Current month only
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            bills = bills.filter(b => {
                const date = new Date(b.dueDate);
                return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
            });
        } else if (this.analyticsFilters.timeRange !== 'all') {
            const now = new Date();
            const cutoffDate = new Date();
            cutoffDate.setMonth(now.getMonth() - this.analyticsFilters.timeRange);
            bills = bills.filter(b => new Date(b.dueDate) >= cutoffDate);
        }

        if (bills.length === 0) {
            reportDiv.innerHTML = '<p>No bills match the selected filters</p>';
            return;
        }

        const grouped = {};
        bills.forEach(bill => {
            const date = new Date(bill.dueDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(bill);
        });

        let html = '<table class="report-table"><thead><tr><th>Month</th><th>Bills</th><th>Paid</th><th>Pending</th><th>Total</th></tr></thead><tbody>';

        Object.keys(grouped).sort().reverse().forEach(key => {
            const monthBills = grouped[key];
            const paid = monthBills.filter(b => b.isPaid).length;
            const pending = monthBills.length - paid;
            const total = monthBills.filter(b => b.isPaid).reduce((sum, b) => sum + b.amount, 0);

            const [year, month] = key.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            const isSelected = this.analyticsFilters.selectedMonth === key;
            const rowClass = isSelected ? 'selected-row' : '';

            html += `
                <tr class="${rowClass} clickable-row" onclick="app.drilldownMonth('${key}')">
                    <td>${monthName}</td>
                    <td>${monthBills.length}</td>
                    <td>${paid}</td>
                    <td>${pending}</td>
                    <td>${this.currencySymbol}${total.toFixed(2)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        reportDiv.innerHTML = html;
    }

    async drilldownMonth(monthKey) {
        if (this.analyticsFilters.selectedMonth === monthKey) {
            // Unselect if clicking the same month
            this.analyticsFilters.selectedMonth = null;
        } else {
            this.analyticsFilters.selectedMonth = monthKey;
        }
        await this.refreshAnalytics();
    }

    async toggleCategoryFromLegend(category) {
        if (this.analyticsFilters.category === category) {
            this.analyticsFilters.category = 'all';
            document.getElementById('analyticsCategoryFilter').value = 'all';
        } else {
            this.analyticsFilters.category = category;
            document.getElementById('analyticsCategoryFilter').value = category;
        }
        await this.refreshAnalytics();
    }

    async updateCategoryBillsList() {
        const categoryBillsInfo = document.getElementById('categoryBillsInfo');
        const categoryBillsList = document.getElementById('categoryBillsList');
        
        // Only show if a specific category is selected
        if (!this.analyticsFilters.category || this.analyticsFilters.category === 'all') {
            categoryBillsInfo.style.display = 'none';
            categoryBillsList.innerHTML = '';
            return;
        }

        let bills = await database.getAllBills();
        const selectedCategory = this.analyticsFilters.category;
        
        // Filter by category
        bills = bills.filter(b => b.category === selectedCategory);
        
        // Apply status filter
        if (this.analyticsFilters.status === 'paid') {
            bills = bills.filter(b => b.isPaid === true);
        } else if (this.analyticsFilters.status === 'unpaid') {
            bills = bills.filter(b => b.isPaid === false);
        }
        
        // Apply time range filter
        if (this.analyticsFilters.selectedMonth) {
            bills = bills.filter(b => {
                const date = new Date(b.dueDate);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return this.analyticsFilters.selectedMonth === key;
            });
        } else if (this.analyticsFilters.timeRange === 'current') {
            // Current month only
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            bills = bills.filter(b => {
                const date = new Date(b.dueDate);
                return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
            });
        } else if (this.analyticsFilters.timeRange !== 'all') {
            const now = new Date();
            const cutoffDate = new Date();
            cutoffDate.setMonth(now.getMonth() - this.analyticsFilters.timeRange);
            bills = bills.filter(b => new Date(b.dueDate) >= cutoffDate);
        }
        
        // Sort by due date (newest first)
        bills.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        
        if (bills.length === 0) {
            categoryBillsInfo.innerHTML = `<span class="filter-tag">No bills found in category: ${selectedCategory}</span>`;
            categoryBillsInfo.style.display = 'block';
            categoryBillsList.innerHTML = '';
            return;
        }
        
        // Calculate totals
        const paidBills = bills.filter(b => b.isPaid);
        const unpaidBills = bills.filter(b => !b.isPaid);
        const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);
        const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
        
        categoryBillsInfo.innerHTML = `
            <span class="filter-tag">${selectedCategory}: ${bills.length} bills • Paid: ${this.currencySymbol}${totalPaid.toFixed(2)} • Unpaid: ${this.currencySymbol}${totalUnpaid.toFixed(2)}</span>
        `;
        categoryBillsInfo.style.display = 'block';
        
        // Create bills list
        let html = '<table class="report-table"><thead><tr><th>Bill Name</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
        
        bills.forEach(bill => {
            const dueDate = new Date(bill.dueDate);
            const formattedDate = dueDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            const statusClass = bill.isPaid ? 'status-paid' : 'status-pending';
            const statusText = bill.isPaid ? '✓ Paid' : '📅 Pending';
            
            html += `
                <tr>
                    <td>${bill.name}</td>
                    <td>${formattedDate}</td>
                    <td>${this.currencySymbol}${bill.amount.toFixed(2)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        categoryBillsList.innerHTML = html;
    }

    async loadSettings() {
        // Load custom currencies
        await this.loadCurrencyDropdown();
        
        // Load currency
        const savedCurrency = await database.getSetting('currency');
        if (savedCurrency) {
            this.currencySymbol = savedCurrency;
            document.getElementById('currencySymbol').value = savedCurrency;
        } else {
            this.currencySymbol = '£';
            document.getElementById('currencySymbol').value = '£';
        }

        // Load theme
        const savedTheme = await database.getSetting('theme');
        if (savedTheme) {
            this.changeTheme(savedTheme, false);
        }

        // Load notification setting
        const notificationsEnabled = await database.getSetting('notificationsEnabled');
        document.getElementById('notificationsEnabled').checked = notificationsEnabled || false;
        this.updateNotificationStatus();

        // Load current profile name
        const currentProfileId = database.getCurrentProfile();
        const profile = await database.getProfileById(currentProfileId);
        if (profile) {
            document.getElementById('currentProfileName').textContent = profile.name;
        }

        // Load profiles list
        await this.loadProfilesList();

        // Load categories
        await this.loadCategoriesList();
        await this.loadCategoryDropdown();
    }

    async loadCategoryDropdown() {
        const categories = await database.getCategories();
        const categorySelect = document.getElementById('billCategory');
        
        categorySelect.innerHTML = '<option value="">Select a category</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    async loadCategoriesList() {
        const categories = await database.getCategories();
        const categoriesList = document.getElementById('categoriesList');
        const categoryCountText = document.getElementById('categoryCountText');

        // Update count text
        categoryCountText.textContent = `View Categories (${categories.length})`;

        if (categories.length === 0) {
            categoriesList.innerHTML = '<p>No categories available</p>';
            return;
        }

        const isDefault = (cat) => DEFAULT_CATEGORIES.includes(cat);

        categoriesList.innerHTML = categories.map(category => `
            <div class="category-item ${isDefault(category) ? 'default' : ''}">
                <div class="category-item-name">
                    ${category}
                    ${isDefault(category) ? '<span style="font-size: 0.8rem; color: var(--text-secondary);">(Default)</span>' : ''}
                </div>
                ${!isDefault(category) ? `<button class="btn btn-danger btn-small" onclick="app.removeCategory('${category}')">Delete</button>` : ''}
            </div>
        `).join('');
    }

    async addCategory() {
        const categoryName = document.getElementById('newCategoryName').value.trim();
        
        if (!categoryName) {
            alert('Please enter a category name');
            return;
        }

        try {
            const added = await database.addCategory(categoryName);
            
            if (!added) {
                alert('This category already exists');
                return;
            }

            document.getElementById('newCategoryName').value = '';
            await this.loadCategoriesList();
            await this.loadCategoryDropdown();
            
        } catch (error) {
            console.error('Error adding category:', error);
            alert('Error adding category. Please try again.');
        }
    }

    async removeCategory(categoryName) {
        if (!confirm(`Delete category "${categoryName}"? Bills using this category will keep it, but it won't appear in the dropdown.`)) {
            return;
        }

        try {
            await database.removeCategory(categoryName);
            await this.loadCategoriesList();
            await this.loadCategoryDropdown();
        } catch (error) {
            console.error('Error removing category:', error);
            alert('Error removing category. Please try again.');
        }
    }

    showNewCategoryInput() {
        document.getElementById('newCategoryInput').style.display = 'flex';
        document.getElementById('newCategoryName').focus();
    }

    hideNewCategoryInput() {
        document.getElementById('newCategoryInput').style.display = 'none';
        document.getElementById('newCategoryName').value = '';
    }

    async saveNewCategoryFromForm() {
        const categoryName = document.getElementById('newCategoryName').value.trim();
        
        if (!categoryName) {
            alert('Please enter a category name');
            return;
        }

        try {
            const added = await database.addCategory(categoryName);
            
            if (!added) {
                alert('This category already exists');
                return;
            }

            // Reload dropdown and select the new category
            await this.loadCategoryDropdown();
            document.getElementById('billCategory').value = categoryName;
            
            this.hideNewCategoryInput();
            
        } catch (error) {
            console.error('Error adding category:', error);
            alert('Error adding category. Please try again.');
        }
    }

    async loadCurrencyDropdown() {
        const customCurrencies = await database.getSetting('customCurrencies') || [];
        const currencySelect = document.getElementById('currencySymbol');
        
        // Default currencies
        const defaultCurrencies = [
            { symbol: '£', name: 'British Pound' },
            { symbol: '$', name: 'US Dollar' },
            { symbol: '€', name: 'Euro' },
            { symbol: '¥', name: 'Yen' },
            { symbol: '₹', name: 'Rupee' },
            { symbol: '₣', name: 'Franc' },
            { symbol: '₽', name: 'Ruble' },
            { symbol: '₩', name: 'Won' }
        ];
        
        // Combine default and custom currencies
        const allCurrencies = [...defaultCurrencies, ...customCurrencies];
        
        currencySelect.innerHTML = allCurrencies
            .map(curr => `<option value="${curr.symbol}">${curr.symbol} (${curr.name})</option>`)
            .join('');
    }

    showNewCurrencyInput() {
        document.getElementById('newCurrencyInput').style.display = 'flex';
        document.getElementById('newCurrencySymbol').focus();
    }

    hideNewCurrencyInput() {
        document.getElementById('newCurrencyInput').style.display = 'none';
        document.getElementById('newCurrencySymbol').value = '';
        document.getElementById('newCurrencyName').value = '';
    }

    async saveNewCurrency() {
        const symbol = document.getElementById('newCurrencySymbol').value.trim();
        const name = document.getElementById('newCurrencyName').value.trim();
        
        if (!symbol || !name) {
            alert('Please enter both symbol and name');
            return;
        }

        if (symbol.length > 3) {
            alert('Currency symbol should be 3 characters or less');
            return;
        }

        try {
            const customCurrencies = await database.getSetting('customCurrencies') || [];
            
            // Check if currency already exists
            if (customCurrencies.some(curr => curr.symbol === symbol)) {
                alert('This currency symbol already exists');
                return;
            }
            
            // Add new currency
            customCurrencies.push({ symbol, name });
            await database.saveSetting('customCurrencies', customCurrencies);
            
            // Reload dropdown and select the new currency
            await this.loadCurrencyDropdown();
            document.getElementById('currencySymbol').value = symbol;
            await this.updateCurrency(symbol);
            
            this.hideNewCurrencyInput();
            
        } catch (error) {
            console.error('Error adding currency:', error);
            alert('Error adding currency. Please try again.');
        }
    }

    async resetCategories() {
        if (!confirm('Reset to default categories? Your custom categories will be removed.')) {
            return;
        }

        try {
            await database.resetCategories();
            await this.loadCategoriesList();
            await this.loadCategoryDropdown();
            alert('Categories reset to defaults');
        } catch (error) {
            console.error('Error resetting categories:', error);
            alert('Error resetting categories. Please try again.');
        }
    }

    async loadProfilesList() {
        const profiles = await database.getAllProfiles();
        const currentProfileId = database.getCurrentProfile();
        const profilesList = document.getElementById('profilesList');

        if (profiles.length === 0) {
            profilesList.innerHTML = '<p>No profiles available</p>';
            return;
        }

        const profileItems = await Promise.all(profiles.map(async profile => {
            const stats = await database.getProfileStats(profile.id);
            const isActive = profile.id === currentProfileId;
            
            return `
                <div class="profile-item ${isActive ? 'active' : ''}" data-profile-id="${profile.id}">
                    <div>
                        <div class="profile-item-name">
                            ${isActive ? '✓ ' : ''}${profile.name}
                        </div>
                        <div class="profile-item-info">
                            ${stats.billCount} bills, ${stats.templateCount} templates
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-small btn-secondary" onclick="app.renameProfile(${profile.id}, '${profile.name.replace(/'/g, "\\'")}')">✏️ Rename</button>
                        ${!isActive ? `<button class="btn btn-small btn-secondary" onclick="app.switchProfile(${profile.id})">Switch</button>` : '<span style="color: var(--success-color); font-weight: 600;">Active</span>'}
                    </div>
                </div>
            `;
        }));

        profilesList.innerHTML = profileItems.join('');
    }

    async renameProfile(profileId, currentName) {
        const newName = prompt('Enter new profile name:', currentName);
        
        if (!newName || newName.trim() === '') {
            return;
        }

        if (newName.trim() === currentName) {
            return;
        }

        try {
            const profiles = await database.getAllProfiles();
            if (profiles.find(p => p.id !== profileId && p.name.toLowerCase() === newName.trim().toLowerCase())) {
                alert('A profile with this name already exists');
                return;
            }

            await database.renameProfile(profileId, newName.trim());
            
            await this.loadProfileSelector();
            await this.loadProfilesList();
            
            const currentProfileId = database.getCurrentProfile();
            if (profileId === currentProfileId) {
                document.getElementById('currentProfileName').textContent = newName.trim();
            }
            
            alert('Profile renamed successfully!');
        } catch (error) {
            console.error('Error renaming profile:', error);
            alert('Error renaming profile. Please try again.');
        }
    }

    async createNewProfile() {
        const profileName = document.getElementById('newProfileName').value.trim();
        
        if (!profileName) {
            alert('Please enter a profile name');
            return;
        }

        try {
            const profiles = await database.getAllProfiles();
            if (profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase())) {
                alert('A profile with this name already exists');
                return;
            }

            const newProfileId = await database.createProfile(profileName);
            document.getElementById('newProfileName').value = '';
            
            await this.loadProfileSelector();
            await this.loadProfilesList();
            
            // Ask if user wants to switch to new profile
            if (confirm(`Profile "${profileName}" created! Switch to this profile now?`)) {
                await this.switchProfile(newProfileId);
            }
        } catch (error) {
            console.error('Error creating profile:', error);
            alert('Error creating profile. Please try again.');
        }
    }

    async deleteCurrentProfile() {
        const profiles = await database.getAllProfiles();
        
        if (profiles.length <= 1) {
            alert('Cannot delete the last profile. At least one profile must exist.');
            return;
        }

        const currentProfileId = database.getCurrentProfile();
        const profile = await database.getProfileById(currentProfileId);
        
        if (!confirm(`Are you sure you want to delete the profile "${profile.name}"? This will permanently delete all bills and templates in this profile. This action cannot be undone!`)) {
            return;
        }

        try {
            await database.deleteProfile(currentProfileId);
            
            // Switch to first available profile
            const remainingProfiles = await database.getAllProfiles();
            await this.switchProfile(remainingProfiles[0].id);
            
            alert('Profile deleted successfully');
        } catch (error) {
            console.error('Error deleting profile:', error);
            alert('Error deleting profile. Please try again.');
        }
    }

    updateCurrency(symbol) {
        this.currencySymbol = symbol;
        // Refresh current view if on timeline or analytics
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        if (activeTab === 'timeline') {
            this.loadTimeline();
        } else if (activeTab === 'analytics') {
            this.loadAnalytics();
        }
    }

    changeTheme(theme, save = true) {
        document.body.setAttribute('data-theme', theme);
        
        // Update active state
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });

        if (save) {
            database.saveSetting('theme', theme);
        }
    }

    async saveSettings() {
        const currency = document.getElementById('currencySymbol').value;
        const notificationsEnabled = document.getElementById('notificationsEnabled').checked;

        await database.saveSetting('currency', currency);
        await database.saveSetting('notificationsEnabled', notificationsEnabled);

        this.currencySymbol = currency;

        if (notificationsEnabled) {
            await this.enableNotifications();
        } else {
            notificationManager.stopPeriodicCheck();
        }

        alert('Settings saved successfully!');
    }

    async resetSettings() {
        if (!confirm('Reset all settings to defaults?')) return;

        await database.saveSetting('currency', '£');
        await database.saveSetting('theme', 'default');
        await database.saveSetting('notificationsEnabled', false);

        this.currencySymbol = '£';
        this.changeTheme('default', false);
        document.getElementById('currencySymbol').value = '£';
        document.getElementById('notificationsEnabled').checked = false;

        notificationManager.stopPeriodicCheck();

        alert('Settings reset to defaults!');
    }

    updateHeaderDateTime() {
        const dateTimeElement = document.getElementById('headerDateTime');
        if (!dateTimeElement) return;
        
        const now = new Date();
        const options = { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        dateTimeElement.textContent = now.toLocaleString('en-GB', options);
    }

    async exportData() {
        try {
            // Get all data from database - across all profiles
            const bills = await database.getAllBillsAllProfiles();
            const templates = await database.getAllTemplatesAllProfiles();
            const profiles = await database.getAllProfiles();
            const categories = await database.getCategories();
            const settings = await database.getAllSettings();
            
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                bills: bills,
                templates: templates,
                profiles: profiles,
                categories: categories,
                settings: settings
            };
            
            // Create blob and download
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Create filename with date and time stamp
            const now = new Date();
            const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
            link.download = `billmanager-backup-${timestamp}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert('Data exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export data. Please try again.');
        }
    }

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.version || !importData.bills) {
                throw new Error('Invalid backup file format');
            }
            
            // Confirm import
            const confirmed = confirm(`Import data from backup dated ${new Date(importData.exportDate).toLocaleDateString()}?\n\n⚠️ WARNING: This will completely DELETE the database and recreate it from the backup.\n\nAre you sure you want to continue?`);
            if (!confirmed) {
                event.target.value = '';
                return;
            }
            
            // Save theme preference before deleting database
            const savedTheme = await database.getSetting('theme');
            
            // Close the database connection
            if (database.db) {
                database.db.close();
            }
            
            // Delete the entire database
            await new Promise((resolve, reject) => {
                const deleteRequest = indexedDB.deleteDatabase('BillManagerDB');
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
                deleteRequest.onblocked = () => {
                    alert('Database deletion blocked. Please close all other tabs with this app open and try again.');
                    reject(new Error('Database deletion blocked'));
                };
            });
            
            // Reinitialize the database
            await database.init();
            
            // Create profile ID mapping (old ID -> new ID)
            const profileIdMap = new Map();
            
            // Import profiles directly with original IDs
            if (importData.profiles && importData.profiles.length > 0) {
                await new Promise((resolve, reject) => {
                    const transaction = database.db.transaction(['profiles'], 'readwrite');
                    const store = transaction.objectStore('profiles');
                    
                    for (const profile of importData.profiles) {
                        store.add(profile);
                    }
                    
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => reject(transaction.error);
                });
            }
            
            // Import categories
            if (importData.categories) {
                await database.saveSetting('categories', importData.categories);
            }
            
            // Import bills directly with original IDs and profileIds
            if (importData.bills && importData.bills.length > 0) {
                await new Promise((resolve, reject) => {
                    const transaction = database.db.transaction(['bills'], 'readwrite');
                    const store = transaction.objectStore('bills');
                    
                    for (const bill of importData.bills) {
                        store.add(bill);
                    }
                    
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => reject(transaction.error);
                });
            }
            
            // Import templates directly with original IDs and profileIds
            if (importData.templates && importData.templates.length > 0) {
                await new Promise((resolve, reject) => {
                    const transaction = database.db.transaction(['templates'], 'readwrite');
                    const store = transaction.objectStore('templates');
                    
                    for (const template of importData.templates) {
                        store.add(template);
                    }
                    
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => reject(transaction.error);
                });
            }
            
            // Import all settings directly (including monthly credits with original profile IDs)
            if (importData.settings) {
                for (const setting of importData.settings) {
                    // Skip currentProfileId, we'll set it to the first imported profile
                    // Skip theme, we'll restore the saved one
                    if (setting.key === 'currentProfileId' || setting.key === 'theme') {
                        continue;
                    }
                    
                    // Import all settings as-is (including monthly credits)
                    await database.saveSetting(setting.key, setting.value);
                }
            }
            
            // Restore theme preference
            if (savedTheme) {
                await database.saveSetting('theme', savedTheme);
            }
            
            // Set current profile to the first imported profile
            const newProfiles = await database.getAllProfiles();
            if (newProfiles.length > 0) {
                database.setCurrentProfile(newProfiles[0].id);
                await database.saveSetting('currentProfileId', newProfiles[0].id);
            }
            
            alert(`Data imported successfully!\n\n✅ All existing data was deleted\n\nImported:\n- ${importData.bills?.length || 0} bills\n- ${importData.templates?.length || 0} templates\n- ${importData.profiles?.length || 0} profiles`);
            
            // Reload the page to reflect changes
            location.reload();
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import data. Please check the file format and try again.');
        }
        
        // Reset file input
        event.target.value = '';
    }

    async deleteAllData() {
        const confirmed = confirm('⚠️ WARNING: This will permanently delete ALL data for the current profile!\n\nThis includes:\n- All bills\n- All templates\n- All settings\n\nThis action CANNOT be undone!\n\nWould you like to export a backup first?');
        
        if (!confirmed) {
            return;
        }
        
        // Prompt to export backup first
        const exportFirst = confirm('Do you want to export your data as a backup before deleting?\n\nClick OK to export first, or Cancel to proceed with deletion without backup.');
        
        if (exportFirst) {
            await this.exportData();
            
            // Give user time to save the export, then ask again
            const proceedWithDelete = confirm('Backup exported. Do you still want to proceed with deleting all data?');
            if (!proceedWithDelete) {
                return;
            }
        }
        
        // Final confirmation
        const finalConfirm = confirm('FINAL CONFIRMATION:\n\nAre you absolutely sure you want to delete all data?\n\nType YES in the next prompt to confirm.');
        if (!finalConfirm) {
            return;
        }
        
        const typedConfirmation = prompt('Type "DELETE" (in capital letters) to confirm deletion:');
        if (typedConfirmation !== 'DELETE') {
            alert('Deletion cancelled. The text did not match.');
            return;
        }
        
        try {
            const currentProfileId = database.getCurrentProfile();
            
            // Delete all bills for current profile
            const bills = await database.getAllBills();
            for (const bill of bills) {
                await database.deleteBill(bill.id);
            }
            
            // Delete all templates for current profile
            const templates = await database.getAllTemplates();
            for (const template of templates) {
                await database.deleteTemplate(template.id);
            }
            
            // Reset settings to defaults
            await database.saveSetting('currency', '£');
            await database.saveSetting('theme', 'default');
            await database.saveSetting('notificationsEnabled', false);
            await database.saveSetting('categories', [
                'Utilities', 'Rent/Mortgage', 'Insurance', 'Subscriptions', 
                'Internet/Phone', 'Credit Card', 'Loan', 'Other'
            ]);
            
            alert('All data has been deleted successfully!');
            
            // Reload the page
            location.reload();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete data. Please try again.');
        }
    }

    async saveMonthlyCredit() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const creditValue = parseFloat(document.getElementById('monthlyCredit').value) || 0;
        
        // Save credit per profile
        const profileId = database.getCurrentProfile();
        const creditKey = `monthlyCredit_${profileId}_${year}_${month}`;
        
        try {
            await database.saveSetting(creditKey, creditValue);
            
            // Reload timeline to refresh bills with updated credit calculations
            await this.loadTimeline();
            
            // Show success feedback
            const saveBtn = document.getElementById('saveCreditBtn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✓';
            saveBtn.style.background = '#4CAF50';
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
            }, 1500);
        } catch (error) {
            console.error('Error saving credit:', error);
            alert('Failed to save credit. Please try again.');
        }
    }

    async updateBalanceCalculations() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Get current credit value
        const creditValue = parseFloat(document.getElementById('monthlyCredit').value) || 0;
        
        // Get bills for this month
        const bills = await database.getBillsByMonth(year, month);
        const unpaidBills = bills.filter(bill => !bill.isPaid);
        const unpaidTotal = unpaidBills.reduce((sum, bill) => {
            const amount = typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0;
            return sum + amount;
        }, 0);
        
        // Calculate and display balance difference
        const balanceDiffEl = document.getElementById('balanceDifference');
        const creditCoverageEl = document.getElementById('creditCoverage');
        
        if (creditValue > 0 || unpaidTotal > 0) {
            const difference = creditValue - unpaidTotal;
            balanceDiffEl.style.display = 'block';
            
            if (difference >= 0) {
                balanceDiffEl.innerHTML = `<span class="balance-surplus">Balance: +${this.currencySymbol}${difference.toFixed(2)}</span>`;
            } else {
                balanceDiffEl.innerHTML = `<span class="balance-deficit">Balance: ${this.currencySymbol}${difference.toFixed(2)}</span>`;
            }
            
            // Calculate credit coverage - how far credit can cover unpaid bills
            if (creditValue > 0 && unpaidBills.length > 0) {
                // Sort unpaid bills by due date
                const sortedUnpaidBills = unpaidBills.sort((a, b) => 
                    new Date(a.dueDate) - new Date(b.dueDate)
                );
                
                let remainingCredit = creditValue;
                let coveredUntilDate = null;
                let billsCovered = 0;
                
                for (const bill of sortedUnpaidBills) {
                    const billAmount = typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0;
                    if (remainingCredit >= billAmount) {
                        remainingCredit -= billAmount;
                        coveredUntilDate = new Date(bill.dueDate);
                        billsCovered++;
                    } else {
                        break;
                    }
                }
                
                if (coveredUntilDate) {
                    const coverageText = coveredUntilDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: coveredUntilDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    });
                    creditCoverageEl.innerHTML = `<span class="credit-coverage-info">💰 Credit covers ${billsCovered} bill${billsCovered > 1 ? 's' : ''} until ${coverageText}</span>`;
                    creditCoverageEl.style.display = 'block';
                } else {
                    creditCoverageEl.innerHTML = `<span class="credit-coverage-info credit-insufficient">⚠️ Credit insufficient to cover any bills</span>`;
                    creditCoverageEl.style.display = 'block';
                }
            } else if (creditValue > 0 && unpaidBills.length === 0) {
                creditCoverageEl.innerHTML = `<span class="credit-coverage-info">✅ No unpaid bills to cover</span>`;
                creditCoverageEl.style.display = 'block';
            } else {
                creditCoverageEl.style.display = 'none';
            }
        } else {
            balanceDiffEl.style.display = 'none';
            creditCoverageEl.style.display = 'none';
        }
    }

    toggleBalances() {
        const toggleBtn = document.getElementById('toggleBalancesBtn');
        const balancesSection = document.getElementById('balancesSection');
        const toggleText = document.getElementById('balancesToggleText');
        const arrow = toggleBtn.querySelector('.toggle-arrow');
        
        toggleBtn.classList.toggle('active');
        balancesSection.classList.toggle('collapsed');
        
        if (balancesSection.classList.contains('collapsed')) {
            toggleText.textContent = 'Show Balances';
            arrow.textContent = '▼';
        } else {
            toggleText.textContent = 'Hide Balances';
            arrow.textContent = '▲';
        }
    }

    showNotesPopup(notes, billName) {
        // Decode HTML entities and escaped characters
        const decodedNotes = notes.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\\n/g, '\n');
        const decodedBillName = billName.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        
        // Create popup
        const popup = document.createElement('div');
        popup.className = 'notes-popup-overlay';
        popup.innerHTML = `
            <div class="notes-popup">
                <div class="notes-popup-header">
                    <h3>📝 Notes: ${decodedBillName}</h3>
                    <button class="notes-popup-close" onclick="this.closest('.notes-popup-overlay').remove()">&times;</button>
                </div>
                <div class="notes-popup-content">
                    ${decodedNotes.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
        
        // Close on overlay click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
        
        document.body.appendChild(popup);
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', async () => {
    app = new BillManagerApp();
    await app.init();
});
