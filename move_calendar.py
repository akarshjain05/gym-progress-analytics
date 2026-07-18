import re

# Read dashboard.js
with open('frontend/js/dashboard.js', 'r') as f:
    dash_content = f.read()

# Extract calendar functions
cal_funcs_regex = r"(let currentCalendarDate = new Date\(\);.*?function renderCalendar\(heatmapData\) \{.*?return html;\n\})"
match = re.search(cal_funcs_regex, dash_content, flags=re.DOTALL)
cal_funcs = match.group(1) if match else ""

# Remove calendar functions from dashboard.js
dash_content = dash_content.replace(cal_funcs, "")
dash_content = dash_content.replace("const calendarHtml = renderCalendar(dash.heatmap_data);", "")
dash_content = dash_content.replace('<div id="calendarWrapper">${calendarHtml}</div>', "")

with open('frontend/js/dashboard.js', 'w') as f:
    f.write(dash_content)


# Read analytics.js
with open('frontend/js/analytics.js', 'r') as f:
    analytics_content = f.read()

# Inject wrapper into html
analytics_content = analytics_content.replace(
    '<div class="bar-divider" style="margin-top:0;">',
    '<div id="calendarWrapper" class="mb-16"></div>\n  <div class="bar-divider" style="margin-top:0;">'
)

# Fix cal_funcs slightly so it uses its own local 'dashboardData'
# Wait, dashboardData is globally defined in dashboard.js, but let's make it local to analytics.js
analytics_funcs = """
let currentCalendarDate = new Date();
let calendarHeatmapData = null;

window.updateCalendarState = function(offsetMonths) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offsetMonths);
  const container = document.getElementById("calendarWrapper");
  if (container && calendarHeatmapData) {
    container.innerHTML = renderCalendar(calendarHeatmapData);
  }
};

function renderCalendar(heatmapData) {
  if (!heatmapData) return "";
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthName = currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);
  const nextDisabled = isCurrentMonth ? "disabled" : "";
  
  let html = `<div class="card cal-card">
    <div class="cal-header">
      <button class="cal-nav-btn" onclick="updateCalendarState(-1)">&#10094;</button>
      <div class="cal-title">${monthName}</div>
      <button class="cal-nav-btn" onclick="updateCalendarState(1)" ${nextDisabled}>&#10095;</button>
    </div>
    <div class="cal-grid">
      <div class="cal-day-name">S</div>
      <div class="cal-day-name">M</div>
      <div class="cal-day-name">T</div>
      <div class="cal-day-name">W</div>
      <div class="cal-day-name">T</div>
      <div class="cal-day-name">F</div>
      <div class="cal-day-name">S</div>
  `;
  for (let i = 0; i < firstDay; i++) { html += `<div class="cal-cell empty"></div>`; }
  for (let d = 1; d <= daysInMonth; d++) {
    const loopDate = new Date(year, month, d);
    if (loopDate > today) { html += `<div class="cal-cell empty"></div>`; continue; }
    const yyyy = loopDate.getFullYear();
    const mm = String(loopDate.getMonth() + 1).padStart(2, '0');
    const dd = String(loopDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const sets = heatmapData[dateStr] || 0;
    if (sets > 0) {
      const tooltipText = `${sets} sets on ${monthName.split(' ')[0]} ${d}`;
      html += `<div class="cal-cell cal-cell-active">${d}<span class="cal-tooltip">${tooltipText}</span></div>`;
    } else {
      html += `<div class="cal-cell">${d}</div>`;
    }
  }
  html += `</div></div>`;
  return html;
}

async function loadCalendar() {
  try {
    const dash = await Api.dashboard();
    calendarHeatmapData = dash.heatmap_data;
    const container = document.getElementById("calendarWrapper");
    if (container) {
      container.innerHTML = renderCalendar(calendarHeatmapData);
    }
  } catch (err) {
    console.error("Failed to load calendar", err);
  }
}
"""

analytics_content = analytics_content.replace(
    'loadInsights();',
    analytics_funcs + '\nloadCalendar();\nloadInsights();'
)

with open('frontend/js/analytics.js', 'w') as f:
    f.write(analytics_content)
