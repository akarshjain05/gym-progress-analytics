import re

with open('frontend/js/workout.js', 'r') as f:
    content = f.read()

loop_old = """      if (editingTemplateId) {
        await apiRequest(`/templates/${escapeHtml(editingTemplateId)}`, {
          method: 'PUT', body: { name, description: desc || null },
        });
        const existing = templates.find(t => t.id === editingTemplateId);
        if (existing) {
          for (const te of existing.exercises) {
            await apiRequest(`/templates/${escapeHtml(editingTemplateId)}/exercises/${escapeHtml(te.id)}`, { method: 'DELETE' });
          }
        }
        for (const ex of payload.exercises) {
          await apiRequest(`/templates/${escapeHtml(editingTemplateId)}/exercises`, { method: 'POST', body: ex });
        }
      }"""

loop_new = """      if (editingTemplateId) {
        await apiRequest(`/templates/${escapeHtml(editingTemplateId)}`, {
          method: 'PUT', body: payload,
        });
      }"""

content = content.replace(loop_old, loop_new)

with open('frontend/js/workout.js', 'w') as f:
    f.write(content)
