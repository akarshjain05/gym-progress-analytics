import re

with open('frontend/js/dashboard.js', 'r') as f:
    content = f.read()

wrapped_js = """
window.DashboardPage = window.DashboardPage || {};

window.DashboardPage.showWrapped = async function() {
  document.getElementById('wrappedModal').style.display = 'flex';
  document.getElementById('wrappedLoading').style.display = 'block';
  document.getElementById('wrappedContent').style.display = 'none';

  try {
    const res = await fetch(Api.baseUrl + "/analytics/wrapped", {
      headers: Api.headers()
    });
    if (!res.ok) throw new Error("Failed to load wrapped data");
    const data = await res.json();
    
    document.getElementById('wrapPeriod').textContent = data.period;
    document.getElementById('wrapVol').textContent = Math.round(data.total_volume_kg).toLocaleString();
    document.getElementById('wrapElephants').textContent = data.elephants;
    document.getElementById('wrapMuscle').textContent = data.most_trained_muscle;
    document.getElementById('wrapPrWeight').textContent = data.biggest_pr_weight;
    document.getElementById('wrapPrExercise').textContent = data.biggest_pr_exercise;
    document.getElementById('wrapStreak').textContent = data.longest_streak;
    document.getElementById('wrapActive').textContent = data.active_days;
    
    document.getElementById('wrappedLoading').style.display = 'none';
    document.getElementById('wrappedContent').style.display = 'block';
  } catch(e) {
    console.error(e);
    document.getElementById('wrappedModal').style.display = 'none';
    window.appAlert("Error", "Could not load your Month in IronLog right now.");
  }
};
"""

# Append it at the end
with open('frontend/js/dashboard.js', 'a') as f:
    f.write(wrapped_js)

# I also need to show the banner in loadDashboard
show_banner = """
    // Show wrapped banner if we have logged anything this month
    // Just show it always for now as a fun feature
    const wrapBanner = document.getElementById('wrappedBanner');
    if (wrapBanner) {
        wrapBanner.style.display = 'block';
    }
"""

content = content.replace("subtitleEl.style.display = \"block\";", "subtitleEl.style.display = \"block\";\n" + show_banner)

with open('frontend/js/dashboard.js', 'w') as f:
    f.write(content)

with open('frontend/js/dashboard.js', 'a') as f:
    f.write(wrapped_js)

