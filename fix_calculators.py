import re

with open("frontend/js/calculators.js", "r") as f:
    content = f.read()

new_html = """const CALCULATORS_HTML = `
  <div id="calcMenu">
    <div style="margin-bottom: 1.5rem;">
      <p style="color: var(--text-secondary); font-size: 0.95rem;">Select a calculator</p>
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="calc-menu-item" onclick="window.CalculatorsPage.showCalc('plate')">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h12v2H6V4zm0 14h12v2H6v-2zM4 6h16v12H4V6z"/></svg></div>
        <div class="menu-title">Plate Calculator</div>
        <div class="menu-arrow">›</div>
      </div>
      <div class="calc-menu-item" onclick="window.CalculatorsPage.showCalc('orm')">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="menu-title">One-Rep Max</div>
        <div class="menu-arrow">›</div>
      </div>
      <div class="calc-menu-item" onclick="window.CalculatorsPage.showCalc('bm')">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21a9 9 0 100-18 9 9 0 000 18z"/><path d="M12 7v5l3 3"/></svg></div>
        <div class="menu-title">Body Metrics</div>
        <div class="menu-arrow">›</div>
      </div>
      <div class="calc-menu-item" onclick="window.CalculatorsPage.showCalc('pw')">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <div class="menu-title">Powerlifting Scores</div>
        <div class="menu-arrow">›</div>
      </div>
      <div class="calc-menu-item" onclick="window.CalculatorsPage.showCalc('mac')">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.5c-3 0-5.5-2.5-5.5-5.5V5h11v11c0 3-2.5 5.5-5.5 5.5z"/></svg></div>
        <div class="menu-title">Macro Split</div>
        <div class="menu-arrow">›</div>
      </div>
    </div>
  </div>

  <div id="calcDetail" style="display: none; padding-bottom: 2rem;">
    <div style="margin-bottom: 1.5rem;">
      <button class="btn" onclick="window.CalculatorsPage.hideCalc()" style="background: none; border: none; color: var(--text-secondary); padding: 0; display: flex; align-items: center; gap: 6px; font-size: 1rem; cursor: pointer;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        Back to Menu
      </button>
    </div>

    <!-- Plate Calculator -->
    <div id="calc-view-plate" class="calc-card" style="display:none;">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h12v2H6V4zm0 14h12v2H6v-2zM4 6h16v12H4V6z"/></svg>
        <h2>Plate Calculator</h2>
      </div>
      <div class="calc-body">
        <div class="calc-row">
          <div class="form-group">
            <label>Target Weight (kg)</label>
            <input type="number" id="plateTarget" class="form-control" placeholder="e.g. 100" value="100">
          </div>
          <div class="form-group">
            <label>Bar Weight (kg)</label>
            <input type="number" id="plateBar" class="form-control" value="20">
          </div>
        </div>
        <div class="calc-result" id="plateResultBox">
          <div class="result-item"><span>Per Side:</span> <span class="result-value" id="platePerSide">40 kg</span></div>
          <div class="plate-display" id="plateVisual"></div>
        </div>
      </div>
    </div>

    <!-- 1RM Calculator -->
    <div id="calc-view-orm" class="calc-card" style="display:none;">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <h2>One-Rep Max</h2>
      </div>
      <div class="calc-body">
        <div class="calc-row">
          <div class="form-group">
            <label>Weight (kg)</label>
            <input type="number" id="ormWeight" class="form-control" placeholder="100">
          </div>
          <div class="form-group">
            <label>Reps</label>
            <input type="number" id="ormReps" class="form-control" placeholder="5">
          </div>
        </div>
        <div class="calc-result">
          <div class="result-item"><span>Estimated 1RM:</span> <span class="result-value" id="ormResult">-</span></div>
        </div>
      </div>
    </div>

    <!-- Body Metrics -->
    <div id="calc-view-bm" class="calc-card" style="display:none;">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21a9 9 0 100-18 9 9 0 000 18z"/><path d="M12 7v5l3 3"/></svg>
        <h2>Body Metrics</h2>
      </div>
      <div class="calc-body">
        <form id="bodyMetricsForm" onsubmit="event.preventDefault(); window.CalculatorsPage.calcBodyMetrics();" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="calc-row">
            <div class="form-group">
              <label>Weight (kg)</label>
              <input type="number" step="0.1" id="bmWeight" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Height (cm)</label>
              <input type="number" step="0.1" id="bmHeight" class="form-control" required>
            </div>
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select id="bmGender" class="form-control">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary w-100">Calculate</button>
        </form>
        <div class="calc-result" id="bmResult" style="display: none;">
          <div class="result-item"><span>BMI:</span> <span class="result-value" id="resBmi"></span></div>
          <div class="result-item"><span>Lean Body Mass:</span> <span class="result-value" id="resLbm"></span></div>
          <div class="result-item"><span>Ideal Weight:</span> <span class="result-value" id="resIbw"></span></div>
          <div class="result-item"><span>FFMI:</span> <span class="result-value" id="resFfmi"></span></div>
        </div>
      </div>
    </div>

    <!-- Powerlifting Scores -->
    <div id="calc-view-pw" class="calc-card" style="display:none;">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <h2>Powerlifting Scores</h2>
      </div>
      <div class="calc-body">
        <form id="powerForm" onsubmit="event.preventDefault(); window.CalculatorsPage.calcPowerlifting();" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="calc-row">
            <div class="form-group">
              <label>Body Weight (kg)</label>
              <input type="number" step="0.1" id="pwWeight" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Total Lifted (kg)</label>
              <input type="number" step="0.5" id="pwTotal" class="form-control" required>
            </div>
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select id="pwGender" class="form-control">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary w-100">Calculate</button>
        </form>
        <div class="calc-result" id="pwResult" style="display: none;">
          <div class="result-item"><span>Wilks (2020):</span> <span class="result-value" id="resWilks"></span></div>
          <div class="result-item"><span>DOTS:</span> <span class="result-value" id="resDots"></span></div>
        </div>
      </div>
    </div>

    <!-- Macro Calculator -->
    <div id="calc-view-mac" class="calc-card" style="display:none;">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.5c-3 0-5.5-2.5-5.5-5.5V5h11v11c0 3-2.5 5.5-5.5 5.5z"/></svg>
        <h2>Macro Split</h2>
      </div>
      <div class="calc-body">
        <form id="macroForm" onsubmit="event.preventDefault(); window.CalculatorsPage.calcMacros();" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group">
            <label>Daily Calories</label>
            <input type="number" id="macCals" class="form-control" required placeholder="e.g. 2500">
          </div>
          <div class="form-group">
            <label>Goal</label>
            <select id="macGoal" class="form-control">
              <option value="maintain">Maintain (30P/40C/30F)</option>
              <option value="cut">Cut (40P/30C/30F)</option>
              <option value="bulk">Bulk (25P/50C/25F)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary w-100">Calculate</button>
        </form>
        <div class="calc-result" id="macResult" style="display: none;">
          <div class="result-item"><span>Protein:</span> <span class="result-value" id="resPro"></span></div>
          <div class="result-item"><span>Carbs:</span> <span class="result-value" id="resCarb"></span></div>
          <div class="result-item"><span>Fat:</span> <span class="result-value" id="resFat"></span></div>
        </div>
      </div>
    </div>

  </div>
`;"""

methods_to_add = """
  showCalc(id) {
    document.getElementById('calcMenu').style.display = 'none';
    document.getElementById('calcDetail').style.display = 'block';
    
    // Hide all
    const views = ['plate', 'orm', 'bm', 'pw', 'mac'];
    views.forEach(v => {
      const el = document.getElementById('calc-view-' + v);
      if (el) el.style.display = 'none';
    });
    
    // Show selected
    const selected = document.getElementById('calc-view-' + id);
    if (selected) selected.style.display = 'flex';
  },

  hideCalc() {
    document.getElementById('calcMenu').style.display = 'block';
    document.getElementById('calcDetail').style.display = 'none';
  },
"""

# Replace CALCULATORS_HTML block
content = re.sub(r'const CALCULATORS_HTML = `.*?`;', new_html, content, flags=re.DOTALL)

# Insert the showCalc and hideCalc methods into window.CalculatorsPage = {
content = content.replace("window.CalculatorsPage = {\n  init() {", "window.CalculatorsPage = {\n" + methods_to_add + "\n  init() {")

with open("frontend/js/calculators.js", "w") as f:
    f.write(content)
