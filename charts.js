// Chart.js implementation for analytics
class ChartManager {
    constructor() {
        this.spendingChart = null;
        this.categoryChart = null;
    }

    // Simple chart rendering without external libraries
    createBarChart(canvasId, data, labels) {
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

        // Draw bars
        data.forEach((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = 40 + index * barWidth + (barWidth * 0.1);
            const y = height - 40 - barHeight;
            const barActualWidth = barWidth * 0.8;

            // Draw bar
            const gradient = ctx.createLinearGradient(0, y, 0, height - 40);
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#2196F3');
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
    }

    createPieChart(canvasId, data, labels) {
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

        const total = data.reduce((sum, val) => sum + val, 0);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;

        const colors = [
            '#4CAF50', '#2196F3', '#FFC107', '#FF5722', 
            '#9C27B0', '#00BCD4', '#FF9800', '#E91E63'
        ];

        let currentAngle = -Math.PI / 2;

        data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;

            // Draw slice
            ctx.beginPath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

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
    }

    async renderSpendingTrend() {
        const trendData = await database.getSpendingTrend(6);
        const amounts = trendData.map(d => d.amount);
        const labels = trendData.map(d => d.month);
        
        this.createBarChart('spendingChart', amounts, labels);
    }

    async renderCategoryBreakdown() {
        const now = new Date();
        const categories = await database.getSpendingByCategory(now.getFullYear(), now.getMonth());
        
        const amounts = Object.values(categories);
        const labels = Object.keys(categories);
        
        this.createPieChart('categoryChart', amounts, labels);
    }

    async updateAllCharts() {
        await this.renderSpendingTrend();
        await this.renderCategoryBreakdown();
    }
}

// Initialize chart manager
const chartManager = new ChartManager();
