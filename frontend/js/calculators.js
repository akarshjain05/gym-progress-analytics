const CALCULATORS_HTML = `
  <div class="calculators-grid">
    <!-- Plate Calculator -->
    <div class="calc-card">
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
    <div class="calc-card">
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
    <div class="calc-card">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21a9 9 0 100-18 9 9 0 000 18z"/><path d="M12 7v5l3 3"/></svg>
        <h2>Body Metrics</h2>
      </div>
      <div class="calc-body">
        <form id="bodyMetricsForm" onsubmit="event.preventDefault(); window.CalculatorsPage.calcBodyMetrics();">
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
    <div class="calc-card">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <h2>Powerlifting Scores</h2>
      </div>
      <div class="calc-body">
        <form id="powerForm" onsubmit="event.preventDefault(); window.CalculatorsPage.calcPowerlifting();">
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
    <div class="calc-card">
      <div class="calc-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.5c-3 0-5.5-2.5-5.5-5.5V5h11v11c0 3-2.5 5.5-5.5 5.5z"/></svg>
        <h2>Macro Split</h2>
      </div>
      <div class="calc-body">
        <form id="macroForm" onsubmit="event.preventDefault(); window.CalculatorsPage.calcMacros();">
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
`;

renderShell("calculators", "Calculators", "Quick math for lifting and nutrition");

window.CalculatorsPage = {
  init() {
    // Inject HTML into the shell's content area
    const content = document.getElementById("pageContent");
    if (!content) return;
    content.innerHTML = CALCULATORS_HTML;
    
    // Set up plate calculator listeners
    const pt = document.getElementById('plateTarget');
    const pb = document.getElementById('plateBar');
    if (pt && pb) {
      pt.addEventListener('input', () => this.calcPlates());
      pb.addEventListener('input', () => this.calcPlates());
      this.calcPlates();
    }

    // Set up 1RM calculator listeners
    const ow = document.getElementById('ormWeight');
    const or = document.getElementById('ormReps');
    if (ow && or) {
      ow.addEventListener('input', () => this.calcORM());
      or.addEventListener('input', () => this.calcORM());
    }

    // Hide loader
    if (typeof window.hideLoading === "function") {
      window.hideLoading();
    }
  },

  calcPlates() {
    const target = parseFloat(document.getElementById('plateTarget').value);
    const bar = parseFloat(document.getElementById('plateBar').value);
    
    if (!target || !bar || target <= bar) {
      document.getElementById('platePerSide').textContent = '0 kg';
      document.getElementById('plateVisual').innerHTML = '';
      return;
    }

    const perSide = (target - bar) / 2;
    document.getElementById('platePerSide').textContent = \`\${perSide} kg\`;

    const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const plateCounts = [];
    let remaining = perSide;

    for (const plate of plates) {
      let count = Math.floor(remaining / plate);
      if (count > 0) {
        plateCounts.push({ weight: plate, count });
        remaining -= (count * plate);
        remaining = Math.round(remaining * 100) / 100;
      }
    }

    let visualHtml = '';
    plateCounts.forEach(p => {
      for (let i=0; i<p.count; i++) {
        let cls = p.weight.toString().replace('.', '-');
        visualHtml += \`<div class="plate plate-\${cls}">\${p.weight}</div>\`;
      }
    });
    
    if (visualHtml) {
      visualHtml += '<div class="bar-end"></div>';
    }

    document.getElementById('plateVisual').innerHTML = visualHtml;
  },

  calcORM() {
    const weight = parseFloat(document.getElementById('ormWeight').value);
    const reps = parseInt(document.getElementById('ormReps').value, 10);
    
    const out = document.getElementById('ormResult');
    if (!weight || !reps || reps <= 0) {
      out.textContent = '-';
      return;
    }
    
    if (reps === 1) {
      out.textContent = \`\${weight} kg\`;
      return;
    }
    
    const epley = weight * (1 + reps / 30);
    let estimated = epley;
    
    if (reps < 37) {
      const brzycki = weight * 36 / (37 - reps);
      estimated = Math.max(epley, brzycki);
    }
    
    out.textContent = \`\${Math.round(estimated * 10) / 10} kg\`;
  },
  
  async calcBodyMetrics() {
    const w = parseFloat(document.getElementById('bmWeight').value);
    const h = parseFloat(document.getElementById('bmHeight').value);
    const g = document.getElementById('bmGender').value;
    try {
      const res = await Api.Calculators.getBodyMetrics({ weight_kg: w, height_cm: h, gender: g });
      document.getElementById('resBmi').textContent = \`\${res.bmi.value} (\${res.bmi.category})\`;
      document.getElementById('resLbm').textContent = res.lbm_kg ? \`\${res.lbm_kg} kg\` : 'N/A';
      document.getElementById('resIbw').textContent = res.ibw_kg ? \`\${res.ibw_kg} kg\` : 'N/A';
      document.getElementById('resFfmi').textContent = \`\${res.ffmi.normalized} (\${res.ffmi.category})\`;
      document.getElementById('bmResult').style.display = 'flex';
    } catch (e) {
      alert("Error: " + e.message);
    }
  },

  async calcPowerlifting() {
    const w = parseFloat(document.getElementById('pwWeight').value);
    const t = parseFloat(document.getElementById('pwTotal').value);
    const g = document.getElementById('pwGender').value;
    try {
      const res = await Api.Calculators.getPowerlifting({ weight_kg: w, total_kg: t, gender: g });
      document.getElementById('resWilks').textContent = res.wilks_score.toFixed(2);
      document.getElementById('resDots').textContent = res.dots_score.toFixed(2);
      document.getElementById('pwResult').style.display = 'flex';
    } catch (e) {
      alert("Error: " + e.message);
    }
  },

  async calcMacros() {
    const c = parseFloat(document.getElementById('macCals').value);
    const g = document.getElementById('macGoal').value;
    try {
      const res = await Api.Calculators.getMacros({ calories: c, goal: g });
      document.getElementById('resPro').textContent = \`\${res.protein_g}g\`;
      document.getElementById('resCarb').textContent = \`\${res.carbs_g}g\`;
      document.getElementById('resFat').textContent = \`\${res.fat_g}g\`;
      document.getElementById('macResult').style.display = 'flex';
    } catch (e) {
      alert("Error: " + e.message);
    }
  }
};

CalculatorsPage.init();
