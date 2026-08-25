with open('frontend/js/features.js', 'r') as f:
    content = f.read()

old_fetch = """    const token = Auth.getToken();
    if (!token) { showToast('Please log in to export data.', 'error'); return; }

    const url = `${escapeHtml(window.IRONLOG_API_BASE)}/export/${escapeHtml(format)}`;
    showToast(`Preparing your ${escapeHtml(format.toUpperCase())} export…`);

    fetch(url, { headers: { Authorization: `Bearer ${escapeHtml(token)}` } })"""

new_fetch = """    const url = `${escapeHtml(window.IRONLOG_API_BASE)}/export/${escapeHtml(format)}`;
    showToast(`Preparing your ${escapeHtml(format.toUpperCase())} export…`);

    fetch(url, { credentials: 'include' })"""

content = content.replace(old_fetch, new_fetch)

with open('frontend/js/features.js', 'w') as f:
    f.write(content)
