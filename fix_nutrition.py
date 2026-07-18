import re

with open('frontend/js/nutrition.js', 'r') as f:
    content = f.read()

old_html = """  <div id="formCard" class="card mb-16" style="display:none;">
    <div class="card-title">Log today's intake</div>
    <form id="calForm">
      <div class="form-row">
        <div class="field"><label for="cDate">Date</label><input type="date" id="cDate" required></div>
        <div class="field"><label for="cCalories">Calories</label><input type="number" id="cCalories" min="0" step="1" required placeholder="e.g. 2400"></div>
        <div class="field"><label for="cProtein">Protein (g)</label><input type="number" id="cProtein" min="0" step="1" placeholder="optional"></div>
        <div class="field"><label for="cCarbs">Carbs (g)</label><input type="number" id="cCarbs" min="0" step="1" placeholder="optional"></div>
        <div class="field"><label for="cFats">Fats (g)</label><input type="number" id="cFats" min="0" step="1" placeholder="optional"></div>
      </div>
      <div class="field"><label for="cNotes">Notes <span class="text-tertiary">(optional)</span></label><input id="cNotes" placeholder="e.g. refeed day"></div>
      <div class="flex gap-12">
        <button type="submit" class="btn btn-primary" id="cSubmitBtn">Save entry</button>
        <button type="button" class="btn btn-ghost" id="cCancelBtn">Cancel</button>
      </div>
    </form>
  </div>"""

new_html = """  <div id="formCard" class="wk-modal-overlay" style="display:none; z-index:9999;">
    <div class="wk-modal" style="max-width:550px;">
      <div class="wk-modal-header">
        <h2 style="margin:0; font-size:18px;">Log today's intake</h2>
      </div>
      <div class="wk-modal-body">
        <form id="calForm">
          <div class="form-row">
            <div class="field"><label for="cDate">Date</label><input type="date" id="cDate" class="form-control" required></div>
            <div class="field"><label for="cCalories">Calories</label><input type="number" id="cCalories" class="form-control" min="0" step="1" required placeholder="e.g. 2400"></div>
            <div class="field"><label for="cProtein">Protein (g)</label><input type="number" id="cProtein" class="form-control" min="0" step="1" placeholder="optional"></div>
            <div class="field"><label for="cCarbs">Carbs (g)</label><input type="number" id="cCarbs" class="form-control" min="0" step="1" placeholder="optional"></div>
            <div class="field"><label for="cFats">Fats (g)</label><input type="number" id="cFats" class="form-control" min="0" step="1" placeholder="optional"></div>
          </div>
          <div class="field"><label for="cNotes">Notes <span class="text-tertiary">(optional)</span></label><input id="cNotes" class="form-control" placeholder="e.g. refeed day"></div>
          <div class="flex gap-12" style="margin-top:16px;">
            <button type="submit" class="btn btn-primary" id="cSubmitBtn">Save entry</button>
            <button type="button" class="btn btn-ghost" id="cCancelBtn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>"""

content = content.replace(old_html, new_html)

# Also ensure display="flex" is used when showing the modal instead of "block" to center it.
content = content.replace("document.getElementById('formCard').style.display = 'block';", "document.getElementById('formCard').style.display = 'flex';")

with open('frontend/js/nutrition.js', 'w') as f:
    f.write(content)
