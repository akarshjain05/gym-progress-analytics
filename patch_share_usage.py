import re

# 1. workout.js
with open('frontend/js/workout.js', 'r') as f:
    w_content = f.read()

w_old_pattern = re.compile(r'  async function generateShareImage\(btnId, data\) \{.*?    // Create a temporary hidden container.*?function cleanup\(\) \{.*?\n  \}\n', re.DOTALL)
w_new = """  async function generateShareImage(btnId, data) {
    const buildHtml = () => `
      <div style="padding: 80px; width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(circle at 15% 0%, rgba(226,64,45,0.1), transparent 50%), radial-gradient(circle at 85% 100%, rgba(62,124,177,0.1), transparent 50%);">
        <div style="font-size: 64px; font-weight: 800; font-family: 'Oswald', sans-serif; text-transform: uppercase; margin-bottom: 24px; color: #E2402D;">Workout Complete</div>
        <div style="font-size: 32px; color: #9CA5AC; margin-bottom: 80px;">${escapeHtml(data.exercises_saved)} Exercises • ${escapeHtml(data.total_sets_saved)} Sets • ${escapeHtml(data.durationStr)}</div>
        
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-bottom: auto;">
          ${data.new_prs && data.new_prs.length > 0 ? 
            data.new_prs.slice(0, 4).map(pr => `
              <div style="background: #1E2227; border-radius: 20px; padding: 40px; border: 2px solid rgba(242, 240, 234, 0.1);">
                <div style="font-size: 36px; font-weight: 700; margin-bottom: 16px;">${escapeHtml(pr.exercise)}</div>
                <div style="font-size: 48px; color: #D4A33B; font-weight: 800;">${escapeHtml(pr.new_1rm_kg)}kg <span style="font-size: 24px; color: #9CA5AC; font-weight: 400;">est. 1RM</span></div>
                <div style="color: #4F9D69; font-size: 28px; font-weight: 600; margin-top: 16px;">+${escapeHtml(Math.round((pr.new_1rm_kg - (pr.old_1rm_kg||0))*10)/10)}kg PR 🏆</div>
              </div>
            `).join('')
          : 
            `<div style="grid-column: span 2; text-align: center; color: #6B7480; font-size: 32px; font-style: italic; margin-top: 80px;">Another solid day in the books.</div>`
          }
        </div>
        
        <div style="display: flex; align-items: center; gap: 24px; margin-top: 60px;">
          <div style="width: 80px; height: 80px; background: #E2402D; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 32px; font-family: 'Oswald', sans-serif;">IL</div>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 2px;">IRONLOG</div>
        </div>
      </div>
    `;
    await window.generateAndShareImage(btnId, "1080px", "1080px", buildHtml, "ironlog-workout.png", "IRONLOG Workout", "Just crushed a workout on IRONLOG!");
  }
"""
w_content = w_old_pattern.sub(w_new, w_content)
with open('frontend/js/workout.js', 'w') as f:
    f.write(w_content)

# 2. lifts.js
with open('frontend/js/lifts.js', 'r') as f:
    l_content = f.read()

l_old_pattern = re.compile(r'  async function generatePRShareImage\(btnId, data, isBWExercise\) \{.*?    // The actual 9:16 card.*?function cleanup\(\) \{.*?\n  \}\n', re.DOTALL)
l_new = """  async function generatePRShareImage(btnId, data, isBWExercise) {
    const buildHtml = () => {
      const prValue = isBWExercise ? data.best_reps_ever + " reps" : formatWeight(data.personal_record_1rm_kg);
      const prDateStr = fmtDate(data.personal_record_date);
      const estText = isBWExercise ? "Max Reps" : "est. 1RM";
      
      return `
        <div style="padding: 120px; width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(circle at 50% -20%, rgba(226,64,45,0.25), transparent 60%), radial-gradient(circle at 120% 100%, rgba(62,124,177,0.15), transparent 70%);">
          <div style="font-size: 72px; font-weight: 800; font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 4px; color: #E2402D; margin-bottom: 24px; text-shadow: 0 0 40px rgba(226,64,45,0.4); text-align: center; width: 100%;">NEW PERSONAL RECORD</div>
          
          <div style="background: rgba(30, 34, 39, 0.7); border-radius: 40px; padding: 120px 80px; width: 100%; max-width: 900px; text-align: center; border: 2px solid rgba(255,255,255,0.05); margin-top: 160px; margin-bottom: 200px; box-shadow: 0 40px 100px rgba(0,0,0,0.5);">
            <div style="font-size: 56px; font-weight: 700; color: #9CA5AC; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 2px;">${escapeHtml(data.exercise)}</div>
            <div style="font-size: 140px; color: #D4A33B; font-weight: 900; line-height: 1;">${escapeHtml(prValue)}</div>
            <div style="font-size: 40px; color: #6B7480; margin-top: 24px; text-transform: uppercase; letter-spacing: 2px;">${estText}</div>
            <div style="font-size: 32px; color: #4F9D69; margin-top: 60px; font-weight: 600;">Achieved ${escapeHtml(prDateStr)}</div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 32px; margin-top: auto;">
            <div style="width: 100px; height: 100px; background: #E2402D; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 40px; font-family: 'Oswald', sans-serif;">IL</div>
            <div style="font-size: 48px; font-weight: 700; letter-spacing: 3px;">IRONLOG</div>
          </div>
        </div>
      `;
    };
    await window.generateAndShareImage(btnId, "1080px", "1920px", buildHtml, "ironlog-pr.png", "IRONLOG PR", "I just hit a new PR on IRONLOG!");
  }
"""
l_content = l_old_pattern.sub(l_new, l_content)
with open('frontend/js/lifts.js', 'w') as f:
    f.write(l_content)
