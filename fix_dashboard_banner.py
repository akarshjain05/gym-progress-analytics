import re

with open('frontend/js/dashboard.js', 'r') as f:
    content = f.read()

banner_html = """
        <div id="wrappedBanner" style="background: linear-gradient(135deg, #FF0055, #0000FF); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; color: white; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(255, 0, 85, 0.3);" onclick="window.DashboardPage.showWrapped()">
          <div style="position: relative; z-index: 2;">
            <h2 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px;">Your Month in IronLog</h2>
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">Tap to reveal your absurd stats.</p>
          </div>
          <div style="position: absolute; right: -20px; bottom: -20px; font-size: 100px; opacity: 0.2; transform: rotate(-15deg); line-height: 1;">🐘</div>
        </div>
"""

# Replace `content.innerHTML = \` with the banner
content = content.replace("content.innerHTML = `\n        \n        ${statsGridHtml}", "content.innerHTML = `\n        " + banner_html + "\n        ${statsGridHtml}")

with open('frontend/js/dashboard.js', 'w') as f:
    f.write(content)
