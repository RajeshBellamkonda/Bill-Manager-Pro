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

    animatePieChart() {
        if (!this.pieCanvas || !this.pieData) {
            this.pieAnimationFrame = null;
            return;
        }

        // Check if any slice is still animating
        let needsAnimation = false;
        if (this.pieAnimationState) {
            for (const key in this.pieAnimationState) {
                const state = this.pieAnimationState[key];
                const isSelected = app.analyticsFilters && app.analyticsFilters.category === key;
                const targetOffset = isSelected ? 15 : 0;
                const targetScale = isSelected ? 1.05 : 1;
                
                // Check if values are still changing (not settled)
                if (Math.abs(state.offset - targetOffset) > 0.1 || Math.abs(state.scale - targetScale) > 0.001) {
                    needsAnimation = true;
                    break;
                }
            }
        }

        // Redraw if animation is needed or forced
        if (needsAnimation || this.needsPieRedraw) {
            this.needsPieRedraw = false;
            const { canvasId, data, labels } = this.pieData;
            this.createPieChart(canvasId, data, labels);
        }

        // Continue animation loop
        this.pieAnimationFrame = requestAnimationFrame(() => this.animatePieChart());
    }

    createPieChart(canvasId, data, labels) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.offsetWidth;
        const height = 550;
        
        // Set canvas size with device pixel ratio for crisp rendering
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);

        // Clear canvas with theme-aware background
        const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg') || '#ffffff';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        if (data.length === 0) {
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
            const textSecondary = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
            ctx.fillStyle = textSecondary;
            ctx.textAlign = 'center';
            ctx.fillText('No data available', width / 2, height / 2);
            return;
        }

        const total = data.reduce((sum, val) => sum + val, 0);
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(width, height) / 2.8;
        const innerRadius = outerRadius * 0.5; // Donut chart for better clarity

        // Vibrant, distinct color palette
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#4CAF50', '#2196F3', '#FF9800', '#E91E63'
        ];

        let currentAngle = -Math.PI / 2;
        this.pieSlices = [];

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.lineJoin = 'round';

        // Initialize animation state if not exists
        if (!this.pieAnimationState) {
            this.pieAnimationState = {};
        }

        // Draw slices
        data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            const percentage = (value / total) * 100;

            // Skip very small slices (less than 1%)
            if (percentage < 1) {
                currentAngle += sliceAngle;
                return;
            }

            const isSelected = app.analyticsFilters && app.analyticsFilters.category === labels[index];
            const targetOffset = isSelected ? 15 : 0;

            // Store slice for click detection
            this.pieSlices.push({
                startAngle: currentAngle,
                endAngle: currentAngle + sliceAngle,
                category: labels[index]
            });

            // Initialize or update animation state
            const sliceKey = labels[index];
            if (!this.pieAnimationState[sliceKey]) {
                this.pieAnimationState[sliceKey] = {
                    offset: 0,
                    scale: 1
                };
            }

            const state = this.pieAnimationState[sliceKey];
            
            // Smooth animation using easing
            const easeFactor = 0.15;
            state.offset += (targetOffset - state.offset) * easeFactor;
            const targetScale = isSelected ? 1.05 : 1;
            state.scale += (targetScale - state.scale) * easeFactor;

            const midAngle = currentAngle + sliceAngle / 2;
            const offsetX = Math.cos(midAngle) * state.offset;
            const offsetY = Math.sin(midAngle) * state.offset;

            // Draw shadow with enhanced effect for selected
            ctx.save();
            ctx.shadowColor = isSelected ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = isSelected ? 15 : 10;
            ctx.shadowOffsetX = isSelected ? 4 : 3;
            ctx.shadowOffsetY = isSelected ? 4 : 3;

            // Draw donut slice
            ctx.beginPath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.arc(centerX + offsetX, centerY + offsetY, outerRadius, currentAngle, currentAngle + sliceAngle);
            ctx.arc(centerX + offsetX, centerY + offsetY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Draw border for separation (theme-aware)
            ctx.save();
            const borderColor = getComputedStyle(document.body).getPropertyValue('--card-bg') || '#ffffff';
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(centerX + offsetX, centerY + offsetY, outerRadius, currentAngle, currentAngle + sliceAngle);
            ctx.arc(centerX + offsetX, centerY + offsetY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // Draw percentage labels on slices (only for slices > 5%)
            if (percentage > 5) {
                const labelRadius = (outerRadius + innerRadius) / 2;
                const labelX = centerX + Math.cos(midAngle) * labelRadius + offsetX;
                const labelY = centerY + Math.sin(midAngle) * labelRadius + offsetY;

                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw text with stroke for better visibility
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 3;
                ctx.strokeText(`${percentage.toFixed(1)}%`, labelX, labelY);
                ctx.fillText(`${percentage.toFixed(1)}%`, labelX, labelY);
                ctx.restore();
            }

            // Draw connector lines and labels outside
            const lineStartRadius = outerRadius + 5;
            const lineEndRadius = outerRadius + 30;
            const labelRadius = outerRadius + 35;
            
            const lineStartX = centerX + Math.cos(midAngle) * lineStartRadius;
            const lineStartY = centerY + Math.sin(midAngle) * lineStartRadius;
            const lineEndX = centerX + Math.cos(midAngle) * lineEndRadius;
            const lineEndY = centerY + Math.sin(midAngle) * lineEndRadius;
            const labelX = centerX + Math.cos(midAngle) * labelRadius;
            const labelY = centerY + Math.sin(midAngle) * labelRadius;

            // Draw line
            ctx.strokeStyle = colors[index % colors.length];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lineStartX, lineStartY);
            ctx.lineTo(lineEndX, lineEndY);
            ctx.stroke();

            // Draw label (theme-aware)
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
            const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#333';
            ctx.fillStyle = textColor;
            ctx.textAlign = labelX > centerX ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[index], labelX, labelY);

            currentAngle += sliceAngle;
        });

        // Store reference for animation
        this.pieCanvas = canvas;
        this.pieData = { data, labels, colors, total, canvasId };
        
        // Start animation loop if needed
        if (!this.pieAnimationFrame) {
            this.animatePieChart();
        }

        // Create legend
        this.createLegend(data, labels, colors, total);

        // Setup click handler with animation trigger
        canvas.style.cursor = 'pointer';
        
        // Hover effect
        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            canvas.style.cursor = (distance >= innerRadius && distance <= outerRadius) ? 'pointer' : 'default';
        };
        
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            // Scale coordinates to canvas resolution
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            // Calculate distance from center
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if click is within the donut ring
            if (distance >= innerRadius && distance <= outerRadius) {
                let angle = Math.atan2(dy, dx);
                // Normalize angle to match the drawing range
                if (angle < -Math.PI / 2) {
                    angle += 2 * Math.PI;
                }

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
                        // Trigger animation and refresh
                        this.needsPieRedraw = true;
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
        const billName = filters.billName || '';
        
        // Determine how many months to fetch
        let monthsToFetch;
        if (timeRange === 'all') {
            monthsToFetch = 60;
        } else if (timeRange === 'current') {
            monthsToFetch = 1;
        } else {
            monthsToFetch = parseInt(timeRange);
        }
        
        let trendData = await database.getSpendingTrend(monthsToFetch, status, billName);
        
        // Apply category filter if needed
        if (category !== 'all') {
            const filteredData = [];
            for (const dataPoint of trendData) {
                const [year, month] = dataPoint.monthKey.split('-');
                const categorySpending = await database.getSpendingByCategory(parseInt(year), parseInt(month) - 1, status, billName);
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
        const billName = filters.billName || '';
        
        if (filters.selectedMonth) {
            // Show categories for specific month
            const [year, month] = filters.selectedMonth.split('-');
            categories = await database.getSpendingByCategory(parseInt(year), parseInt(month) - 1, status, billName);
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
                const monthCategories = await database.getSpendingByCategory(date.getFullYear(), date.getMonth(), status, billName);
                
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
