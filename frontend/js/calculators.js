window.CalculatorsPage = {
  init() {
    renderShell('calculators');
    
    // Set up plate calculator listeners
    document.getElementById('plateTarget').addEventListener('input', () => this.calcPlates());
    document.getElementById('plateBar').addEventListener('input', () => this.calcPlates());
    this.calcPlates();

    // Set up 1RM calculator listeners
    document.getElementById('ormWeight').addEventListener('input', () => this.calcORM());
    document.getElementById('ormReps').addEventListener('input', () => this.calcORM());
  },

  // ── Plate Calculator (Frontend Only) ──
  calcPlates() {
    const target = parseFloat(document.getElementById('plateTarget').value);
    const bar = parseFloat(document.getElementById('plateBar').value);
    
    if (!target || !bar || target <= bar) {
      document.getElementById('platePerSide').textContent = '0 kg';
      document.getElementById('plateVisual').innerHTML = '';
      return;
    }

    const perSide = (target - bar) / 2;
    document.getElementById('platePerSide').textContent = `${perSide} kg`;

    const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const plateCounts = [];
    let remaining = perSide;

    for (const plate of plates) {
      let count = Math.floor(remaining / plate);
      if (count > 0) {
        plateCounts.push({ weight: plate, count });
        remaining -= (count * plate);
        // JS floating point safety
        remaining = Math.round(remaining * 100) / 100;
      }
    }

    let visualHtml = '';
    plateCounts.forEach(p => {
      for (let i=0; i<p.count; i++) {
        let cls = p.weight.toString().replace('.', '-');
        visualHtml += `<div class="plate plate-${cls}">${p.weight}</div>`;
      }
    });
    
    if (visualHtml) {
      visualHtml += '<div class="bar-end"></div>';
    }

    document.getElementById('plateVisual').innerHTML = visualHtml;
  },

  // ── 1RM Calculator (Frontend Only) ──
  calcORM() {
    const weight = parseFloat(document.getElementById('ormWeight').value);
    const reps = parseInt(document.getElementById('ormReps').value, 10);
    
    const out = document.getElementById('ormResult');
    if (!weight || !reps || reps <= 0) {
      out.textContent = '-';
      return;
    }
    
    if (reps === 1) {
      out.textContent = `${weight} kg`;
      return;
    }
    
    const epley = weight * (1 + reps / 30);
    let estimated = epley;
    
    if (reps < 37) {
      const brzycki = weight * 36 / (37 - reps);
      estimated = Math.max(epley, brzycki);
    }
    
    out.textContent = `${Math.round(estimated * 10) / 10} kg`;
  },

  // ── Backend Calculations ──
  
  async calcBodyMetrics() {
    const w = parseFloat(document.getElementById('bmWeight').value);
    const h = parseFloat(document.getElementById('bmHeight').value);
    const g = document.getElementById('bmGender').value;

    try {
      const res = await Api.Calculators.getBodyMetrics({ weight_kg: w, height_cm: h, gender: g });
      
      document.getElementById('resBmi').textContent = `${res.bmi.value} (${res.bmi.category})`;
      document.getElementById('resLbm').textContent = res.lbm_kg ? `${res.lbm_kg} kg` : 'N/A';
      document.getElementById('resIbw').textContent = res.ibw_kg ? `${res.ibw_kg} kg` : 'N/A';
      document.getElementById('resFfmi').textContent = `${res.ffmi.normalized} (${res.ffmi.category})`;
      
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
      
      document.getElementById('resPro').textContent = `${res.protein_g}g`;
      document.getElementById('resCarb').textContent = `${res.carbs_g}g`;
      document.getElementById('resFat').textContent = `${res.fat_g}g`;
      
      document.getElementById('macResult').style.display = 'flex';
    } catch (e) {
      alert("Error: " + e.message);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }
  CalculatorsPage.init();
});
