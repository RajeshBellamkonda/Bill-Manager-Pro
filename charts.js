// Chart.js implementation for analytics
class ChartManager {
    constructor() {
        this.spendingChart = null;
        this.categoryChart = null;
    }

    // Simple chart rendering without external libraries
    createBarChart(canvasId, data, labels, monthKeys = []) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = 300;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) {
            ctx.font = '16px Arial';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', width / 2, height / 2);
            return;
        }

        const maxValue = Math.max(...data);
        const barWidth = (width - 60) / data.length;
        const chartHeight = height - 60;

        // Store bar positions for click detection
        this.barPositions = [];

        // Draw bars
        data.forEach((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = 40 + index * barWidth + (barWidth * 0.1);
            const y = height - 40 - barHeight;
            const barActualWidth = barWidth * 0.8;

            // Store position for click detection
            this.barPositions.push({
                x, y, width: barActualWidth, height: barHeight,
                monthKey: monthKeys[index]
            });

            // Check if this month is selected
            const isSelected = app.analyticsFilters && app.analyticsFilters.selectedMonth === monthKeys[index];

            // Draw bar
            const gradient = ctx.createLinearGradient(0, y, 0, height - 40);
            if (isSelected) {
                gradient.addColorStop(0, '#FF9800');
                gradient.addColorStop(1, '#FF5722');
            } else {
                gradient.addColorStop(0, '#4CAF50');
                gradient.addColorStop(1, '#2196F3');
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barActualWidth, barHeight);

            // Draw value on top
            ctx.font = '12px Arial';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#333';
            ctx.textAlign = 'center';
            ctx.fillText(`${app.currencySymbol}${value.toFixed(0)}`, x + barActualWidth / 2, y - 5);

            // Draw label
            ctx.save();
            ctx.translate(x + barActualWidth / 2, height - 25);
            ctx.rotate(-Math.PI / 6);
            ctx.font = '11px Arial';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
            ctx.textAlign = 'right';
            ctx.fillText(labels[index], 0, 0);
            ctx.restore();
        });

        // Draw Y-axis
        ctx.beginPath();
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color') || '#ccc';
        ctx.moveTo(40, 20);
        ctx.lineTo(40, height - 40);
        ctx.lineTo(width - 20, height - 40);
        ctx.stroke();

        // Setup click handler
        canvas.style.cursor = 'pointer';
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            for (const bar of this.barPositions) {
                if (x >= bar.x && x <= bar.x + bar.width && y >= bar.y && y <= bar.y + bar.height) {
                    app.drilldownMonth(bar.monthKey);
                    break;
                }
            }
        };
    }

    createPieChart(canvasId, data, labels) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = 400;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) {
            ctx.font = '16px Arial';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', width / 2, height / 2);
            return;
        }

        const total = data.reduce((sum, val) => sum + val, 0);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2.5;

        const colors = [
            '#4CAF50', '#2196F3', '#FFC107', '#FF5722', 
            '#9C27B0', '#00BCD4', '#FF9800', '#E91E63'
        ];

        let currentAngle = -Math.PI / 2;
        this.pieSlices = [];

        data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;

            // Check if this category is selected
            const isSelected = app.analyticsFilters && app.analyticsFilters.category === labels[index];

            // Store slice for click detection
            this.pieSlices.push({
                startAngle: currentAngle,
                endAngle: currentAngle + sliceAngle,
                category: labels[index]
            });

            // Draw slice
            ctx.beginPath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            // Highlight selected slice
            if (isSelected) {
                ctx.beginPath();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 4;
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.closePath();
                ctx.stroke();
            }

            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 40);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 40);

            ctx.font = '12px Arial';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#333';
            ctx.textAlign = labelX > centerX ? 'left' : 'right';
            ctx.fillText(`${labels[index]}`, labelX, labelY);
            ctx.font = '10px Arial';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
            ctx.fillText(`${app.currencySymbol}${value.toFixed(2)} (${((value/total)*100).toFixed(1)}%)`, labelX, labelY + 15);

            currentAngle += sliceAngle;
        });

        // Create legend
        this.createLegend(data, labels, colors, total);

        // Setup click handler
        canvas.style.cursor = 'pointer';
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate angle from center
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                let angle = Math.atan2(dy, dx);
                if (angle < -Math.PI / 2) angle += 2 * Math.PI;

                for (const slice of this.pieSlices) {
                    if (angle >= slice.startAngle && angle <= slice.endAngle) {
                        // Toggle category filter
                        if (app.analyticsFilters.category === slice.category) {
                            app.analyticsFilters.category = 'all';
                            document.getElementById('analyticsCategoryFilter').value = 'all';
                        } else {
                            app.analyticsFilters.category = slice.category;
                            document.getElementById('analyticsCategoryFilter').value = slice.category;
                        }
                        app.refreshAnalytics();
                        break;
                    }
                }
            }
        };
    }

    createLegend(data, labels, colors, total) {
        const legendContainer = document.getElementById('categoryLegend');
        if (!legendContainer) return;

        // Create array of items with all data
        const items = data.map((value, index) => ({
            value,
            label: labels[index],
            color: colors[index % colors.length],
            percentage: (value / total) * 100
        }));

        // Sort by percentage descending
        items.sort((a, b) => b.percentage - a.percentage);

        let legendHTML = '<div class="legend-items">';
        
        items.forEach(item => {
            const isSelected = app.analyticsFilters && app.analyticsFilters.category === item.label;
            
            legendHTML += `
                <div class="legend-item ${isSelected ? 'legend-item-selected' : ''}" onclick="app.toggleCategoryFromLegend('${item.label}')">
                    <span class="legend-color" style="background-color: ${item.color}"></span>
                    <span class="legend-label">${item.label}</span>
                    <span class="legend-value">${app.currencySymbol}${item.value.toFixed(2)}</span>
                    <span class="legend-percent">(${item.percentage.toFixed(1)}%)</span>
                </div>
            `;
        });
        
        legendHTML += '</div>';
        legendContainer.innerHTML = legendHTML;
    }

    async renderSpendingTrend(filters = {}) {
        const timeRange = filters.timeRange || 'current';
        const category = filters.category || 'all';
        const status = filters.status || 'all';
        
        // Determine how many months to fetch
        let monthsToFetch;
        if (timeRange === 'all') {
            monthsToFetch = 60;
        } else if (timeRange === 'current') {
            monthsToFetch = 1;
        } else {
            monthsToFetch = parseInt(timeRange);
        }
        
        let trendData = await database.getSpendingTrend(monthsToFetch, status);
        
        // Apply category filter if needed
        if (category !== 'all') {
            const filteredData = [];
            for (const dataPoint of trendData) {
                const [year, month] = dataPoint.monthKey.split('-');
                const categorySpending = await database.getSpendingByCategory(parseInt(year), parseInt(month) - 1, status);
                const amount = categorySpending[category] || 0;
                filteredData.push({
                    month: dataPoint.month,
                    amount: amount,
                    monthKey: dataPoint.monthKey
                });
            }
            trendData = filteredData;
        }
        
        const amounts = trendData.map(d => d.amount);
        const labels = trendData.map(d => d.month);
        const monthKeys = trendData.map(d => d.monthKey);
        
        this.createBarChart('spendingChart', amounts, labels, monthKeys);
    }

    async renderCategoryBreakdown(filters = {}) {
        let categories = {};
        const status = filters.status || 'all';
        
        if (filters.selectedMonth) {
            // Show categories for specific month
            const [year, month] = filters.selectedMonth.split('-');
            categories = await database.getSpendingByCategory(parseInt(year), parseInt(month) - 1, status);
        } else {
            // Aggregate across time range
            const timeRange = filters.timeRange || 'current';
            const now = new Date();
            
            // Determine how many months to iterate
            let monthsToIterate;
            if (timeRange === 'all') {
                monthsToIterate = 60;
            } else if (timeRange === 'current') {
                monthsToIterate = 1;
            } else {
                monthsToIterate = parseInt(timeRange);
            }
            
            for (let i = 0; i < monthsToIterate; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthCategories = await database.getSpendingByCategory(date.getFullYear(), date.getMonth(), status);
                
                for (const [cat, amount] of Object.entries(monthCategories)) {
                    categories[cat] = (categories[cat] || 0) + amount;
                }
            }
        }
        
        const amounts = Object.values(categories);
        const labels = Object.keys(categories);
        
        this.createPieChart('categoryChart', amounts, labels);
    }

    async updateAllCharts(filters = {}) {
        await this.renderSpendingTrend(filters);
        await this.renderCategoryBreakdown(filters);
    }
}

// Initialize chart manager
const chartManager = new ChartManager();
