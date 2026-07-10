import re

with open('frontend/css/mobile.css', 'r') as f:
    css = f.read()

# mobile topbar
css = re.sub(r'background:\s*#1e2327;', r'background: var(--surface-2, #1e2327);', css)
css = css.replace('border-bottom: 1px solid rgba(255,255,255,0.07);', 'border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));')
css = css.replace('border-top: 1px solid rgba(255,255,255,0.07);', 'border-top: 1px solid var(--border, rgba(255,255,255,0.07));')
css = css.replace('border-top: 1px solid rgba(255,255,255,0.08);', 'border-top: 1px solid var(--border, rgba(255,255,255,0.08));')
css = css.replace('border-right: 1px solid rgba(255,255,255,0.08);', 'border-right: 1px solid var(--border, rgba(255,255,255,0.08));')

css = css.replace('color: #e8e0d5;', 'color: var(--text-primary, #e8e0d5);')
css = css.replace('color: #a09880;', 'color: var(--text-secondary, #a09880);')
css = css.replace('color: #6b7280;', 'color: var(--text-tertiary, #6b7280);')

css = css.replace('background: rgba(255,255,255,0.08);', 'background: var(--border, rgba(255,255,255,0.08));')
css = css.replace('background: rgba(255,255,255,0.05);', 'background: var(--border, rgba(255,255,255,0.05));')

with open('frontend/css/mobile.css', 'w') as f:
    f.write(css)

print("Done")
