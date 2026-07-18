import re

# ------------- WEIGHT.JS -------------
with open('frontend/js/weight.js', 'r') as f:
    w_content = f.read()

w_old_html = """  <div id="formCard" class="card mb-16" style="display:none;">
    <div class="card-title">Log a weigh-in</div>
    <form id="weightForm">
      <div class="form-row">
        <div class="field">
          <label for="wDate">Date</label>
          <input type="date" id="wDate" required>
        </div>
        <div class="field">
          <label for="wWeight">Weight (kg)</label>
          <input type="number" id="wWeight" step="0.1" min="1" max="400" required placeholder="e.g. 82.5">
        </div>
        <div class="field">
          <label for="wBf">Body fat % <span class="text-tertiary">(optional)</span></label>
          <input type="number" id="wBf" step="0.1" min="0" max="80" placeholder="e.g. 18.5">
        </div>
      </div>
      <div class="field">
        <label for="wNotes">Notes <span class="text-tertiary">(optional)</span></label>
        <input type="text" id="wNotes" placeholder="e.g. after fasted cardio">
      </div>
      <div class="flex gap-12">
        <button type="submit" class="btn btn-primary" id="wSubmitBtn">Save entry</button>
        <button type="button" class="btn btn-ghost" id="wCancelBtn">Cancel</button>
      </div>
    </form>
  </div>"""

w_new_html = """  <div id="formCard" class="wk-modal-overlay" style="display:none; z-index:9999;">
    <div class="wk-modal" style="max-width:500px;">
      <div class="wk-modal-header">
        <h2 style="margin:0; font-size:18px;">Log a weigh-in</h2>
      </div>
      <div class="wk-modal-body">
        <form id="weightForm">
          <div class="form-row">
            <div class="field">
              <label for="wDate">Date</label>
              <input type="date" id="wDate" class="form-control" required>
            </div>
            <div class="field">
              <label for="wWeight">Weight (kg)</label>
              <input type="number" id="wWeight" class="form-control" step="0.1" min="1" max="400" required placeholder="e.g. 82.5">
            </div>
            <div class="field">
              <label for="wBf">Body fat % <span class="text-tertiary">(optional)</span></label>
              <input type="number" id="wBf" class="form-control" step="0.1" min="0" max="80" placeholder="e.g. 18.5">
            </div>
          </div>
          <div class="field">
            <label for="wNotes">Notes <span class="text-tertiary">(optional)</span></label>
            <input type="text" id="wNotes" class="form-control" placeholder="e.g. after fasted cardio">
          </div>
          <div class="flex gap-12" style="margin-top:16px;">
            <button type="submit" class="btn btn-primary" id="wSubmitBtn">Save entry</button>
            <button type="button" class="btn btn-ghost" id="wCancelBtn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>"""

w_content = w_content.replace(w_old_html, w_new_html)
w_content = w_content.replace("document.getElementById('formCard').style.display = 'block';", "document.getElementById('formCard').style.display = 'flex';")

with open('frontend/js/weight.js', 'w') as f:
    f.write(w_content)


# ------------- MEASUREMENTS.JS -------------
with open('frontend/js/measurements.js', 'r') as f:
    m_content = f.read()

m_old_html = """  <div id="formCard" class="card mb-16" style="display:none;">
    <div class="card-title">Log measurements (cm)</div>
    <form id="measureForm">
      <div class="form-row">
        <div class="field"><label for="mDate">Date</label><input type="date" id="mDate" required></div>
        <div class="field"><label for="mChest">Chest</label><input type="number" id="mChest" step="0.1" placeholder="e.g. 102.5"></div>
        <div class="field"><label for="mWaist">Waist</label><input type="number" id="mWaist" step="0.1" placeholder="e.g. 85.0"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="mNeck">Neck</label><input type="number" id="mNeck" step="0.1" placeholder="e.g. 40.5"></div>
        <div class="field"><label for="mHip">Hip</label><input type="number" id="mHip" step="0.1"></div>
        <div class="field"><label for="mArm">Arm</label><input type="number" id="mArm" step="0.1"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="mForearm">Forearm</label><input type="number" id="mForearm" step="0.1"></div>
        <div class="field"><label for="mThigh">Thigh</label><input type="number" id="mThigh" step="0.1"></div>
        <div class="field"><label for="mCalf">Calf</label><input type="number" id="mCalf" step="0.1"></div>
      </div>
      <div class="field">
        <label for="mShoulders">Shoulders</label>
        <input type="number" id="mShoulders" step="0.1">
      </div>
      <div class="field">
        <label for="mNotes">Notes <span class="text-tertiary">(optional)</span></label>
        <input type="text" id="mNotes" placeholder="e.g. morning, unflexed">
      </div>
      <div class="flex gap-12">
        <button type="submit" class="btn btn-primary" id="mSubmitBtn">Save entry</button>
        <button type="button" class="btn btn-ghost" id="mCancelBtn">Cancel</button>
      </div>
    </form>
  </div>"""

m_new_html = """  <div id="formCard" class="wk-modal-overlay" style="display:none; z-index:9999;">
    <div class="wk-modal" style="max-width:600px;">
      <div class="wk-modal-header">
        <h2 style="margin:0; font-size:18px;">Log measurements (cm)</h2>
      </div>
      <div class="wk-modal-body">
        <form id="measureForm">
          <div class="form-row">
            <div class="field"><label for="mDate">Date</label><input type="date" id="mDate" class="form-control" required></div>
            <div class="field"><label for="mChest">Chest</label><input type="number" id="mChest" class="form-control" step="0.1" placeholder="e.g. 102.5"></div>
            <div class="field"><label for="mWaist">Waist</label><input type="number" id="mWaist" class="form-control" step="0.1" placeholder="e.g. 85.0"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="mNeck">Neck</label><input type="number" id="mNeck" class="form-control" step="0.1" placeholder="e.g. 40.5"></div>
            <div class="field"><label for="mHip">Hip</label><input type="number" id="mHip" class="form-control" step="0.1"></div>
            <div class="field"><label for="mArm">Arm</label><input type="number" id="mArm" class="form-control" step="0.1"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="mForearm">Forearm</label><input type="number" id="mForearm" class="form-control" step="0.1"></div>
            <div class="field"><label for="mThigh">Thigh</label><input type="number" id="mThigh" class="form-control" step="0.1"></div>
            <div class="field"><label for="mCalf">Calf</label><input type="number" id="mCalf" class="form-control" step="0.1"></div>
          </div>
          <div class="field">
            <label for="mShoulders">Shoulders</label>
            <input type="number" id="mShoulders" class="form-control" step="0.1">
          </div>
          <div class="field">
            <label for="mNotes">Notes <span class="text-tertiary">(optional)</span></label>
            <input type="text" id="mNotes" class="form-control" placeholder="e.g. morning, unflexed">
          </div>
          <div class="flex gap-12" style="margin-top:16px;">
            <button type="submit" class="btn btn-primary" id="mSubmitBtn">Save entry</button>
            <button type="button" class="btn btn-ghost" id="mCancelBtn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>"""

m_content = m_content.replace(m_old_html, m_new_html)
m_content = m_content.replace("document.getElementById('formCard').style.display = 'block';", "document.getElementById('formCard').style.display = 'flex';")

with open('frontend/js/measurements.js', 'w') as f:
    f.write(m_content)

