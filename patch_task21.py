with open('/Users/a91732/.gemini/antigravity/brain/6ae1ef93-be71-4d07-b4ab-b7f97ee61cdf/task.md', 'r') as f:
    content = f.read()
content = content.replace('[ ] 21. Zero coverage', '[x] 21. Zero coverage')
with open('/Users/a91732/.gemini/antigravity/brain/6ae1ef93-be71-4d07-b4ab-b7f97ee61cdf/task.md', 'w') as f:
    f.write(content)
