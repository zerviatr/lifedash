// ============ CHART UTILS v5.0 (FAZ 10) ============
const ChartUtils = {
  tooltip: null,

  initTooltip() {
    if (this.tooltip) return;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'chart-tooltip';
    document.body.appendChild(this.tooltip);
  },

  showTooltip(x, y, html) {
    if (!this.tooltip) this.initTooltip();
    this.tooltip.innerHTML = html;
    this.tooltip.classList.add('visible');
    this.tooltip.style.left = (x + 12) + 'px';
    this.tooltip.style.top = (y - 10) + 'px';
  },

  hideTooltip() {
    if (this.tooltip) this.tooltip.classList.remove('visible');
  },

  getColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  },

  barChart(canvasId, data, options) {
    options = options || {};
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const labels = data.labels || [];
    const values = data.values || [];
    const maxVal = Math.max(...values, 1);
    const padding = { top: 20, right: 10, bottom: 30, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barW = Math.min(chartW / labels.length * 0.6, 40);
    const gap = chartW / labels.length;

    const accentColor = this.getColor('--accent') || '#6366f1';
    const accentLight = this.getColor('--accent-light') || '#818cf8';
    const textColor = this.getColor('--text-4') || '#64748b';
    const borderColor = this.getColor('--border') || '#1e293b';

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= 4; i++) {
      var gy = padding.top + chartH - (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(w - padding.right, gy);
      ctx.stroke();
      // Labels
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal / 4 * i), padding.left - 6, gy + 3);
    }

    // Animated bars
    var barData = [];
    for (var j = 0; j < values.length; j++) {
      var barH = (values[j] / maxVal) * chartH;
      var bx = padding.left + gap * j + (gap - barW) / 2;
      var by = padding.top + chartH - barH;

      // Gradient fill
      var grad = ctx.createLinearGradient(bx, by, bx, padding.top + chartH);
      grad.addColorStop(0, accentLight);
      grad.addColorStop(1, accentColor);
      ctx.fillStyle = grad;

      // Rounded top bar
      var r = Math.min(barW / 2, 4);
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + barW - r, by);
      ctx.quadraticCurveTo(bx + barW, by, bx + barW, by + r);
      ctx.lineTo(bx + barW, padding.top + chartH);
      ctx.lineTo(bx, padding.top + chartH);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.fill();

      barData.push({ x: bx, y: by, w: barW, h: barH, value: values[j], label: labels[j] });

      // Bottom label
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[j], bx + barW / 2, h - 8);
    }

    // Hover interaction
    var self = this;
    canvas.onmousemove = function(e) {
      var cr = canvas.getBoundingClientRect();
      var mx = e.clientX - cr.left;
      var my = e.clientY - cr.top;
      var found = false;
      for (var k = 0; k < barData.length; k++) {
        var bd = barData[k];
        if (mx >= bd.x && mx <= bd.x + bd.w && my >= bd.y && my <= bd.y + bd.h) {
          self.showTooltip(e.clientX, e.clientY, '<strong>' + bd.label + '</strong><br>' + (options.prefix || '') + bd.value + (options.suffix || ''));
          canvas.style.cursor = 'pointer';
          found = true;
          break;
        }
      }
      if (!found) { self.hideTooltip(); canvas.style.cursor = 'default'; }
    };
    canvas.onmouseleave = function() { self.hideTooltip(); };
  },

  lineChart(canvasId, data, options) {
    options = options || {};
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    var w = rect.width;
    var h = rect.height;

    var labels = data.labels || [];
    var values = data.values || [];
    var maxVal = Math.max(...values, 1);
    var padding = { top: 20, right: 10, bottom: 30, left: 40 };
    var chartW = w - padding.left - padding.right;
    var chartH = h - padding.top - padding.bottom;

    var accentColor = this.getColor('--accent') || '#6366f1';
    var accentLight = this.getColor('--accent-light') || '#818cf8';
    var textColor = this.getColor('--text-4') || '#64748b';
    var borderColor = this.getColor('--border') || '#1e293b';

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= 4; i++) {
      var gy = padding.top + chartH - (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(w - padding.right, gy);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal / 4 * i), padding.left - 6, gy + 3);
    }

    // Points
    var points = [];
    for (var j = 0; j < values.length; j++) {
      var px = padding.left + (chartW / (labels.length - 1 || 1)) * j;
      var py = padding.top + chartH - (values[j] / maxVal) * chartH;
      points.push({ x: px, y: py, value: values[j], label: labels[j] });
    }

    // Area gradient
    if (points.length > 1) {
      var grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, 'rgba(99,102,241,0.2)');
      grad.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      for (var k = 0; k < points.length; k++) ctx.lineTo(points[k].x, points[k].y);
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var l = 0; l < points.length; l++) {
      if (l === 0) ctx.moveTo(points[l].x, points[l].y);
      else ctx.lineTo(points[l].x, points[l].y);
    }
    ctx.stroke();

    // Dots
    for (var m = 0; m < points.length; m++) {
      ctx.beginPath();
      ctx.arc(points[m].x, points[m].y, 4, 0, Math.PI * 2);
      ctx.fillStyle = accentLight;
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bottom label
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(points[m].label, points[m].x, h - 8);
    }

    // Hover
    var self = this;
    canvas.onmousemove = function(e) {
      var cr = canvas.getBoundingClientRect();
      var mx = e.clientX - cr.left;
      var found = false;
      for (var n = 0; n < points.length; n++) {
        if (Math.abs(mx - points[n].x) < 15) {
          self.showTooltip(e.clientX, e.clientY, '<strong>' + points[n].label + '</strong><br>' + (options.prefix || '') + points[n].value + (options.suffix || ''));
          canvas.style.cursor = 'pointer';
          found = true;
          break;
        }
      }
      if (!found) { self.hideTooltip(); canvas.style.cursor = 'default'; }
    };
    canvas.onmouseleave = function() { self.hideTooltip(); };
  }
};
