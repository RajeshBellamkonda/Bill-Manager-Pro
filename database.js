// IndexedDB Database Manager
class BillDatabase {
    constructor() {
        this.dbName = 'BillManagerDB';
        this.version = 2;
        this.db = null;
        this.currentProfile = 'default';
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // Bills store
                if (!db.objectStoreNames.contains('bills')) {
                    const billStore = db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
                    billStore.createIndex('dueDate', 'dueDate', { unique: false });
                    billStore.createIndex('category', 'category', { unique: false });
                    billStore.createIndex('frequency', 'frequency', { unique: false });
                    billStore.createIndex('status', 'status', { unique: false });
                    billStore.createIndex('profileId', 'profileId', { unique: false });
                } else if (oldVersion < 2) {
                    // Add profileId index to existing store
                    const transaction = event.target.transaction;
                    const billStore = transaction.objectStore('bills');
                    if (!billStore.indexNames.contains('profileId')) {
                        billStore.createIndex('profileId', 'profileId', { unique: false });
                    }
                }

                // Templates store
                if (!db.objectStoreNames.contains('templates')) {
                    const templateStore = db.createObjectStore('templates', { keyPath: 'id', autoIncrement: true });
                    templateStore.createIndex('name', 'name', { unique: false });
                    templateStore.createIndex('createdDate', 'createdDate', { unique: false });
                    templateStore.createIndex('profileId', 'profileId', { unique: false });
                } else if (oldVersion < 2) {
                    const transaction = event.target.transaction;
                    const templateStore = transaction.objectStore('templates');
                    if (!templateStore.indexNames.contains('profileId')) {
                        templateStore.createIndex('profileId', 'profileId', { unique: false });
                    }
                }

                // Profiles store
                if (!db.objectStoreNames.contains('profiles')) {
                    const profileStore = db.createObjectStore('profiles', { keyPath: 'id', autoIncrement: true });
                    profileStore.createIndex('name', 'name', { unique: true });
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    setCurrentProfile(profileId) {
        this.currentProfile = profileId;
    }

    getCurrentProfile() {
        return this.currentProfile;
    }

    // Bills CRUD operations
    async addBill(bill) {
        const transaction = this.db.transaction(['bills'], 'readwrite');
        const store = transaction.objectStore('bills');
        
        const billData = {
            name: bill.name,
            amount: parseFloat(bill.amount),
            dueDate: bill.dueDate,
            frequency: bill.frequency,
            category: bill.category || 'Uncategorized',
            notes: bill.notes || '',
            reminderDays: parseInt(bill.reminderDays) || 3,
            status: bill.status || 'pending',
            isPaid: bill.isPaid || false,
            profileId: this.currentProfile,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(billData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateBill(id, bill) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bills'], 'readwrite');
            const store = transaction.objectStore('bills');
            
            // Get existing bill first within the same transaction
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (!existing) {
                    reject(new Error('Bill not found'));
                    return;
                }
                
                const updatedBill = {
                    ...existing,
                    ...bill,
                    id: id,
                    amount: parseFloat(bill.amount),
                    reminderDays: parseInt(bill.reminderDays) || 3,
                    lastModified: new Date().toISOString()
                };
                
                const putRequest = store.put(updatedBill);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteBill(id) {
        const transaction = this.db.transaction(['bills'], 'readwrite');
        const store = transaction.objectStore('bills');

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getBillById(id) {
        const transaction = this.db.transaction(['bills'], 'readonly');
        const store = transaction.objectStore('bills');

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getBill(id) {
        return this.getBillById(id);
    }

    async getAllBills() {
        const transaction = this.db.transaction(['bills'], 'readonly');
        const store = transaction.objectStore('bills');
        const index = store.index('profileId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(this.currentProfile);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getBillsByMonth(year, month) {
        const bills = await this.getAllBills();
        
        return bills.filter(bill => {
            const billDate = new Date(bill.dueDate);
            return billDate.getFullYear() === year && billDate.getMonth() === month;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    async getBillsByDateRange(startDate, endDate) {
        const bills = await this.getAllBills();
        const start = new Date(startDate);
        const end = new Date(endDate);

        return bills.filter(bill => {
            const billDate = new Date(bill.dueDate);
            return billDate >= start && billDate <= end;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    async markBillAsPaid(id, isPaid = true) {
        const transaction = this.db.transaction(['bills'], 'readwrite');
        const store = transaction.objectStore('bills');
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const bill = getRequest.result;
                if (bill) {
                    bill.isPaid = isPaid;
                    bill.status = isPaid ? 'paid' : 'pending';
                    bill.paidDate = isPaid ? new Date().toISOString() : null;
                    bill.lastModified = new Date().toISOString();
                    
                    const putRequest = store.put(bill);
                    putRequest.onsuccess = () => resolve(putRequest.result);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Bill not found'));
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // Template operations
    async saveTemplate(templateName, bills) {
        const transaction = this.db.transaction(['templates'], 'readwrite');
        const store = transaction.objectStore('templates');

        const template = {
            name: templateName,
            bills: bills.map(bill => ({
                name: bill.name,
                amount: bill.amount,
                frequency: bill.frequency,
                category: bill.category,
                notes: bill.notes,
                reminderDays: bill.reminderDays,
                dayOfMonth: new Date(bill.dueDate).getDate()
            })),
            profileId: this.currentProfile,
            createdDate: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(template);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllTemplates() {
        const transaction = this.db.transaction(['templates'], 'readonly');
        const store = transaction.objectStore('templates');
        const index = store.index('profileId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(this.currentProfile);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getTemplateById(id) {
        const transaction = this.db.transaction(['templates'], 'readonly');
        const store = transaction.objectStore('templates');

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getTemplate(id) {
        return this.getTemplateById(id);
    }

    async deleteTemplate(id) {
        const transaction = this.db.transaction(['templates'], 'readwrite');
        const store = transaction.objectStore('templates');

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async applyTemplateToMonth(templateId, year, month) {
        const template = await this.getTemplateById(templateId);
        if (!template) return;

        const addedBills = [];
        for (const billTemplate of template.bills) {
            const dueDate = new Date(year, month, billTemplate.dayOfMonth);
            
            // Check if this bill already exists for this month
            const existingBills = await this.getBillsByMonth(year, month);
            const duplicate = existingBills.find(b => 
                b.name === billTemplate.name && 
                new Date(b.dueDate).getDate() === billTemplate.dayOfMonth
            );

            if (!duplicate) {
                const newBill = {
                    name: billTemplate.name,
                    amount: billTemplate.amount,
                    dueDate: dueDate.toISOString().split('T')[0],
                    frequency: billTemplate.frequency,
                    category: billTemplate.category,
                    notes: billTemplate.notes,
                    reminderDays: billTemplate.reminderDays,
                    status: 'pending',
                    isPaid: false
                };
                
                const billId = await this.addBill(newBill);
                addedBills.push(billId);
            }
        }

        return addedBills;
    }

    async applyTemplateToYear(templateId, year) {
        const results = [];
        for (let month = 0; month < 12; month++) {
            const added = await this.applyTemplateToMonth(templateId, year, month);
            results.push({ month, added: added.length });
        }
        return results;
    }

    // Settings operations
    async saveSetting(key, value) {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');

        return new Promise((resolve, reject) => {
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key) {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllSettings() {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Profile operations
    async createProfile(profileName) {
        const transaction = this.db.transaction(['profiles'], 'readwrite');
        const store = transaction.objectStore('profiles');

        const profile = {
            name: profileName,
            createdDate: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(profile);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllProfiles() {
        const transaction = this.db.transaction(['profiles'], 'readonly');
        const store = transaction.objectStore('profiles');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getProfileById(id) {
        const transaction = this.db.transaction(['profiles'], 'readonly');
        const store = transaction.objectStore('profiles');

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getProfile(id) {
        return this.getProfileById(id);
    }

    async renameProfile(profileId, newName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['profiles'], 'readwrite');
            const store = transaction.objectStore('profiles');
            
            const getRequest = store.get(profileId);
            
            getRequest.onsuccess = () => {
                const profile = getRequest.result;
                if (!profile) {
                    reject(new Error('Profile not found'));
                    return;
                }
                
                profile.name = newName;
                
                const putRequest = store.put(profile);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteProfile(profileId) {
        // Delete all bills for this profile
        const bills = await this.getAllBillsForProfile(profileId);
        const billTransaction = this.db.transaction(['bills'], 'readwrite');
        const billStore = billTransaction.objectStore('bills');
        
        for (const bill of bills) {
            billStore.delete(bill.id);
        }

        // Delete all templates for this profile
        const templates = await this.getAllTemplatesForProfile(profileId);
        const templateTransaction = this.db.transaction(['templates'], 'readwrite');
        const templateStore = templateTransaction.objectStore('templates');
        
        for (const template of templates) {
            templateStore.delete(template.id);
        }

        // Delete the profile
        const profileTransaction = this.db.transaction(['profiles'], 'readwrite');
        const profileStore = profileTransaction.objectStore('profiles');

        return new Promise((resolve, reject) => {
            const request = profileStore.delete(profileId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllBillsForProfile(profileId) {
        const transaction = this.db.transaction(['bills'], 'readonly');
        const store = transaction.objectStore('bills');
        const index = store.index('profileId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(profileId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllTemplatesForProfile(profileId) {
        const transaction = this.db.transaction(['templates'], 'readonly');
        const store = transaction.objectStore('templates');
        const index = store.index('profileId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(profileId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllBillsAllProfiles() {
        const transaction = this.db.transaction(['bills'], 'readonly');
        const store = transaction.objectStore('bills');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllTemplatesAllProfiles() {
        const transaction = this.db.transaction(['templates'], 'readonly');
        const store = transaction.objectStore('templates');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getProfileStats(profileId) {
        const bills = await this.getAllBillsForProfile(profileId);
        const templates = await this.getAllTemplatesForProfile(profileId);
        
        return {
            billCount: bills.length,
            templateCount: templates.length
        };
    }

    // Analytics operations
    async getMonthlySpending(year, month, status = 'paid') {
        const bills = await this.getBillsByMonth(year, month);
        return bills.reduce((total, bill) => {
            if (status === 'all') return total + bill.amount;
            if (status === 'paid' && bill.isPaid === true) return total + bill.amount;
            if (status === 'unpaid' && bill.isPaid === false) return total + bill.amount;
            return total;
        }, 0);
    }

    async getSpendingByCategory(year, month, status = 'paid') {
        const bills = await this.getBillsByMonth(year, month);
        const categories = {};

        bills.forEach(bill => {
            let include = false;
            if (status === 'all') {
                include = true;
            } else if (status === 'paid') {
                include = bill.isPaid === true;
            } else if (status === 'unpaid') {
                include = bill.isPaid === false;
            }
            
            if (include) {
                const category = bill.category || 'Uncategorized';
                categories[category] = (categories[category] || 0) + bill.amount;
            }
        });

        return categories;
    }

    async getSpendingTrend(months = 6, status = 'paid') {
        const trend = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const spending = await this.getMonthlySpending(date.getFullYear(), date.getMonth(), status);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            trend.push({
                month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
                amount: spending,
                monthKey: monthKey
            });
        }

        return trend;
    }

    // Category operations
    async getCategories() {
        const saved = await this.getSetting('categories');
        if (saved && Array.isArray(saved)) {
            return saved;
        }
        // Return default categories if none saved
        await this.saveSetting('categories', DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
    }

    async addCategory(categoryName) {
        const categories = await this.getCategories();
        if (!categories.includes(categoryName)) {
            categories.push(categoryName);
            categories.sort();
            await this.saveSetting('categories', categories);
            return true;
        }
        return false;
    }

    async removeCategory(categoryName) {
        const categories = await this.getCategories();
        const filtered = categories.filter(c => c !== categoryName);
        await this.saveSetting('categories', filtered);
    }

    async resetCategories() {
        await this.saveSetting('categories', DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
    }
}

// Default categories
const DEFAULT_CATEGORIES = [
    'Rent/Mortgage',
    'Utilities',
    'Electric',
    'Water',
    'Gas',
    'Internet',
    'Phone',
    'Insurance',
    'Car Insurance',
    'Health Insurance',
    'Home Insurance',
    'Subscriptions',
    'Streaming Services',
    'Gym Membership',
    'Credit Card',
    'Loan Payment',
    'Groceries',
    'Transportation',
    'Healthcare',
    'Education',
    'Entertainment',
    'Other'
];

// Initialize database
const database = new BillDatabase();
