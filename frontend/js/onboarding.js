/**
 * onboarding.js — IRONLOG First-Time User Onboarding
 *
 * Shows a 3-step modal on first login:
 *   Step 1: Set goal weight + activity level
 *   Step 2: Log today's body weight
 *   Step 3: Log first workout session
 *
 * Stored in localStorage so it only shows once per device.
 * Can be re-triggered from Profile page.
 *
 * Include on dashboard.html AFTER layout.js and dashboard.js:
 *   <script src="js/onboarding.js"></script>
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ironlog_onboarding_complete';
  const STORAGE_VERSION = 'v1';

  // ── Public API ────────────────────────────────────────────────────────────
  window.IronlogOnboarding = {
    /** Call this to re-show onboarding (e.g. from Profile page) */
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      showOnboarding();
    },
    /** Check if onboarding has been completed */
    isComplete() {
      return localStorage.getItem(STORAGE_KEY) === STORAGE_VERSION;
    },
  };

  // ── Init — run after DOM is ready ─────────────────────────────────────────
  function init() {
    // Only show if user is logged in and hasn't completed onboarding
    if (!Auth.isLoggedIn()) return;
    if (window.IronlogOnboarding.isComplete()) return;

    // Check server-side: if user already has profile data, they completed
    // onboarding on another device — skip it and mark as complete locally.
    Api.getProfile().then(function(user) {
      if (user && user.onboarding_completed) {
        localStorage.setItem(STORAGE_KEY, STORAGE_VERSION);
        return; // don't show onboarding
      }
      // Small delay so the dashboard renders first (better UX)
      setTimeout(showOnboarding, 800);
    }).catch(function() {
      // If profile fetch fails, fall back to showing onboarding
      setTimeout(showOnboarding, 800);
    });
  }

  // ── Build and show modal ──────────────────────────────────────────────────
  function showOnboarding() {
    // Remove any existing instance
    const existing = document.getElementById('onboarding-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'ob-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Welcome to IRONLOG');

    overlay.innerHTML = `
      <div class="ob-modal">

        <!-- Progress bar -->
        <div class="ob-progress">
          <div class="ob-progress-bar" id="obProgressBar" style="width:33%"></div>
        </div>

        <!-- Step indicator -->
        <div class="ob-steps">
          <div class="ob-step active" id="obStep1Dot"><span>1</span></div>
          <div class="ob-step-line"></div>
          <div class="ob-step" id="obStep2Dot"><span>2</span></div>
          <div class="ob-step-line"></div>
          <div class="ob-step" id="obStep3Dot"><span>3</span></div>
        </div>

        <!-- ── STEP 1: Profile + Goal ────────────────────── -->
        <div class="ob-step-content" id="obStep1">
          <div class="ob-emoji">🎯</div>
          <h2 class="ob-title">Welcome to IRONLOG</h2>
          <p class="ob-subtitle">Let's set up your profile so we can give you accurate predictions and strength standards.</p>

          <div class="ob-form">
            <div class="ob-field-row">
              <div class="ob-field">
                <label class="ob-label">Current weight</label>
                <div class="ob-input-group">
                  <input type="number" id="obCurrentWeight" class="ob-input"
                    placeholder="e.g. 75" min="30" max="250" step="0.1">
                  <span class="ob-input-suffix">kg</span>
                </div>
              </div>
              <div class="ob-field">
                <label class="ob-label">Goal weight</label>
                <div class="ob-input-group">
                  <input type="number" id="obGoalWeight" class="ob-input"
                    placeholder="e.g. 80" min="30" max="250" step="0.1">
                  <span class="ob-input-suffix">kg</span>
                </div>
              </div>
            </div>

            <div class="ob-field-row">
              <div class="ob-field">
                <label class="ob-label">Age</label>
                <input type="number" id="obAge" class="ob-input"
                  placeholder="e.g. 22" min="10" max="100">
              </div>
              <div class="ob-field">
                <label class="ob-label">Height</label>
                <div class="ob-input-group">
                  <input type="number" id="obHeight" class="ob-input"
                    placeholder="e.g. 175" min="100" max="250">
                  <span class="ob-input-suffix">cm</span>
                </div>
              </div>
            </div>

            <div class="ob-field">
              <label class="ob-label">Gender</label>
              <div class="ob-radio-group">
                <label class="ob-radio">
                  <input type="radio" name="obGender" value="male"> Male
                </label>
                <label class="ob-radio">
                  <input type="radio" name="obGender" value="female"> Female
                </label>
                <label class="ob-radio">
                  <input type="radio" name="obGender" value="other"> Other
                </label>
              </div>
            </div>

            <div class="ob-field">
              <label class="ob-label">Activity level</label>
              <select id="obActivity" class="ob-select">
                <option value="sedentary">Sedentary (desk job, no exercise)</option>
                <option value="light">Light (1–3 workouts/week)</option>
                <option value="moderate" selected>Moderate (3–5 workouts/week)</option>
                <option value="active">Active (6–7 workouts/week)</option>
                <option value="very_active">Very active (physical job + training)</option>
              </select>
            </div>
          </div>

          <div class="ob-error" id="obStep1Error"></div>

          <div class="ob-actions">
            <button class="ob-btn-skip" id="obSkip1">Skip for now</button>
            <button class="ob-btn-primary" id="obNext1">Save & Continue →</button>
          </div>
        </div>

        <!-- ── STEP 2: Log today's weight ───────────────── -->
        <div class="ob-step-content" id="obStep2" style="display:none;">
          <div class="ob-emoji">⚖️</div>
          <h2 class="ob-title">Log today's weight</h2>
          <p class="ob-subtitle">Your first weigh-in starts your progress timeline. Log it every morning for the most accurate trend.</p>

          <div class="ob-form">
            <div class="ob-field">
              <label class="ob-label">Today's weight</label>
              <div class="ob-input-group ob-input-large">
                <input type="number" id="obWeightLog" class="ob-input ob-input-big"
                  placeholder="75.0" min="30" max="250" step="0.1">
                <span class="ob-input-suffix ob-suffix-big">kg</span>
              </div>
            </div>
            <div class="ob-tip">
              💡 <strong>Tip:</strong> Weigh yourself first thing in the morning, after using the bathroom, before eating. This gives the most consistent readings.
            </div>
          </div>

          <div class="ob-error" id="obStep2Error"></div>

          <div class="ob-actions">
            <button class="ob-btn-ghost" id="obBack2">← Back</button>
            <button class="ob-btn-skip" id="obSkip2">Skip</button>
            <button class="ob-btn-primary" id="obNext2">Log Weight →</button>
          </div>
        </div>

        <!-- ── STEP 3: Log first session ────────────────── -->
        <div class="ob-step-content" id="obStep3" style="display:none;">
          <div class="ob-emoji">🏋️</div>
          <h2 class="ob-title">Log your first exercise</h2>
          <p class="ob-subtitle">Log one set from your last workout to kickstart your strength tracking.</p>

          <div class="ob-form">
            <div class="ob-field">
              <label class="ob-label">Exercise</label>
              <select id="obExercise" class="ob-select"></select>
            </div>
            <div class="ob-field-row">
              <div class="ob-field">
                <label class="ob-label">Weight</label>
                <div class="ob-input-group">
                  <input type="number" id="obLiftWeight" class="ob-input"
                    placeholder="60" min="0" max="600" step="0.5">
                  <span class="ob-input-suffix">kg</span>
                </div>
              </div>
              <div class="ob-field">
                <label class="ob-label">Reps</label>
                <input type="number" id="obLiftReps" class="ob-input"
                  placeholder="8" min="1" max="100">
              </div>
            </div>
            <div class="ob-tip">
              💡 <strong>Tip:</strong> For dumbbell exercises, enter the weight of ONE dumbbell.
            </div>
          </div>

          <div class="ob-error" id="obStep3Error"></div>

          <div class="ob-actions">
            <button class="ob-btn-ghost" id="obBack3">← Back</button>
            <button class="ob-btn-skip" id="obSkip3">Skip</button>
            <button class="ob-btn-primary" id="obNext3">Log & Finish 🎉</button>
          </div>
        </div>

        <!-- ── DONE ──────────────────────────────────────── -->
        <div class="ob-step-content ob-done" id="obDone" style="display:none;">
          <div class="ob-emoji ob-emoji-big">🎉</div>
          <h2 class="ob-title">You're all set!</h2>
          <p class="ob-subtitle">IRONLOG is ready to track your progress. Come back every day to log your weight and workouts.</p>
          <div class="ob-done-tips">
            <div class="ob-done-tip">📊 Check <strong>Dashboard</strong> for your overview</div>
            <div class="ob-done-tip">💪 Use <strong>Lifts</strong> to track strength progress</div>
            <div class="ob-done-tip">🤖 Visit <strong>AI Coach</strong> for personalised advice</div>
          </div>
          <div class="ob-actions ob-actions-center">
            <button class="ob-btn-primary ob-btn-wide" id="obFinish">Start Training →</button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
    bindEvents(overlay);

    // Pre-fill weight from step 1 into step 2
    document.getElementById('obCurrentWeight').addEventListener('input', function () {
      document.getElementById('obWeightLog').value = this.value;
    });

    // Load exercises for step 3
    loadExercisesForOnboarding();
  }

  // ── Load exercises ────────────────────────────────────────────────────────
  async function loadExercisesForOnboarding() {
    try {
      const exercises = await apiRequest('/exercises');
      const select = document.getElementById('obExercise');
      if (!select) return;
      // Show only most common compound lifts first
      const priority = ['Bench Press','Squat','Deadlift','Overhead Press','Lat Pulldown','Barbell Row'];
      const sorted = [
        ...exercises.filter(e => priority.includes(e.name)),
        ...exercises.filter(e => !priority.includes(e.name)).sort((a, b) => a.name.localeCompare(b.name)),
      ];
      select.innerHTML = sorted.map(e =>
        `<option value="${e.id}">${e.name}</option>`
      ).join('');
    } catch (e) {
      // Non-fatal — step 3 can still be skipped
    }
  }

  // ── Step navigation ───────────────────────────────────────────────────────
  function goToStep(n) {
    [1, 2, 3].forEach(i => {
      document.getElementById(`obStep${i}`)?.style && (document.getElementById(`obStep${i}`).style.display = i === n ? 'block' : 'none');
      const dot = document.getElementById(`obStep${i}Dot`);
      if (dot) {
        dot.classList.toggle('active', i === n);
        dot.classList.toggle('done', i < n);
      }
    });
    document.getElementById('obDone').style.display = 'none';
    document.getElementById('obProgressBar').style.width = `${Math.round((n / 3) * 100)}%`;
  }

  function goToDone() {
    [1, 2, 3].forEach(i => {
      document.getElementById(`obStep${i}`).style.display = 'none';
      document.getElementById(`obStep${i}Dot`).classList.add('done');
      document.getElementById(`obStep${i}Dot`).classList.remove('active');
    });
    document.getElementById('obDone').style.display = 'block';
    document.getElementById('obProgressBar').style.width = '100%';
  }

  function setError(stepN, msg) {
    const el = document.getElementById(`obStep${stepN}Error`);
    if (el) el.textContent = msg || '';
  }

  function setLoading(btnId, loading, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Saving…' : text;
  }

  // ── Event bindings ────────────────────────────────────────────────────────
  function bindEvents(overlay) {

    // ── Step 1: Save profile ────────────────────────────────────────────────
    document.getElementById('obNext1').addEventListener('click', async () => {
      setError(1, '');
      const currentWeight = parseFloat(document.getElementById('obCurrentWeight').value);
      const goalWeight = parseFloat(document.getElementById('obGoalWeight').value);
      const age = parseInt(document.getElementById('obAge').value);
      const height = parseFloat(document.getElementById('obHeight').value);
      const gender = document.querySelector('input[name="obGender"]:checked')?.value;
      const activity = document.getElementById('obActivity').value;

      // Validation
      if (!currentWeight || currentWeight < 30 || currentWeight > 300) {
        setError(1, 'Please enter a valid current weight (30–300 kg).');
        return;
      }
      if (goalWeight && (goalWeight < 30 || goalWeight > 300)) {
        setError(1, 'Please enter a valid goal weight (30–300 kg).');
        return;
      }

      setLoading('obNext1', true, 'Save & Continue →');
      try {
        const profilePayload = {};
        if (gender) profilePayload.gender = gender;
        if (age && age >= 10 && age <= 100) profilePayload.age = age;
        if (height && height >= 100 && height <= 250) profilePayload.height_cm = height;
        if (activity) profilePayload.activity_level = activity;
        if (goalWeight) profilePayload.goal_weight_kg = goalWeight;

        if (Object.keys(profilePayload).length > 0) {
          await apiRequest('/profile/me', { method: 'PUT', body: profilePayload });
        }

        // Pre-fill weight step
        if (currentWeight) {
          document.getElementById('obWeightLog').value = currentWeight;
        }

        goToStep(2);
      } catch (err) {
        setError(1, err.message || 'Could not save profile. Try again.');
      } finally {
        setLoading('obNext1', false, 'Save & Continue →');
      }
    });

    document.getElementById('obSkip1').addEventListener('click', () => goToStep(2));

    // ── Step 2: Log weight ──────────────────────────────────────────────────
    document.getElementById('obNext2').addEventListener('click', async () => {
      setError(2, '');
      const weight = parseFloat(document.getElementById('obWeightLog').value);

      if (!weight || weight < 30 || weight > 300) {
        setError(2, 'Please enter a valid weight (30–300 kg).');
        return;
      }

      setLoading('obNext2', true, 'Log Weight →');
      try {
        const today = new Date().toISOString().split('T')[0];
        await apiRequest('/weight', {
          method: 'POST',
          body: { date: today, weight_kg: weight },
        });
        goToStep(3);
      } catch (err) {
        // If already logged today, still proceed
        if (err.message && err.message.includes('already')) {
          goToStep(3);
        } else {
          setError(2, err.message || 'Could not log weight. Try again.');
        }
      } finally {
        setLoading('obNext2', false, 'Log Weight →');
      }
    });

    document.getElementById('obSkip2').addEventListener('click', () => goToStep(3));
    document.getElementById('obBack2').addEventListener('click', () => goToStep(1));

    // ── Step 3: Log lift ────────────────────────────────────────────────────
    document.getElementById('obNext3').addEventListener('click', async () => {
      setError(3, '');
      const exerciseId = parseInt(document.getElementById('obExercise').value);
      const weight = parseFloat(document.getElementById('obLiftWeight').value);
      const reps = parseInt(document.getElementById('obLiftReps').value);

      if (!exerciseId) { setError(3, 'Please select an exercise.'); return; }
      if (!weight || weight < 0 || weight > 600) { setError(3, 'Please enter a valid weight.'); return; }
      if (!reps || reps < 1 || reps > 100) { setError(3, 'Please enter valid reps (1–100).'); return; }

      setLoading('obNext3', true, 'Log & Finish 🎉');
      try {
        const today = new Date().toISOString().split('T')[0];
        await apiRequest('/lifts/session', {
          method: 'POST',
          body: {
            exercise_id: exerciseId,
            date: today,
            sets: [{ weight_kg: weight, reps, rpe: null }],
            notes: 'First session logged via onboarding',
          },
        });
        complete();
      } catch (err) {
        setError(3, err.message || 'Could not log session. Try again.');
      } finally {
        setLoading('obNext3', false, 'Log & Finish 🎉');
      }
    });

    document.getElementById('obSkip3').addEventListener('click', () => { complete(); });
    document.getElementById('obBack3').addEventListener('click', () => goToStep(2));

    // ── Done ────────────────────────────────────────────────────────────────
    document.getElementById('obFinish').addEventListener('click', () => {
      dismiss(overlay);
      // Refresh dashboard data
      if (typeof loadDashboard === 'function') loadDashboard();
    });
  }

  function complete() {
    localStorage.setItem(STORAGE_KEY, STORAGE_VERSION);
    // Tell the server so other devices know onboarding is done
    Api.updateProfile({ onboarding_completed: true }).catch(function() {});
    goToDone();
  }

  function dismiss(overlay) {
    overlay.classList.add('ob-fadeout');
    setTimeout(() => overlay.remove(), 400);
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
