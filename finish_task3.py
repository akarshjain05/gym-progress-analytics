with open('/Users/a91732/.gemini/antigravity/brain/6ae1ef93-be71-4d07-b4ab-b7f97ee61cdf/task.md', 'r') as f:
    content = f.read()

content = content.replace('[ ] 14', '[x] 14')
content = content.replace('[ ] 15', '[x] 15')
content = content.replace('[ ] 16', '[x] 16')
content = content.replace('[ ] 17', '[x] 17')
content = content.replace('[ ] 18', '[x] 18')
content = content.replace('[ ] 19', '[x] 19')

with open('/Users/a91732/.gemini/antigravity/brain/6ae1ef93-be71-4d07-b4ab-b7f97ee61cdf/task.md', 'w') as f:
    f.write(content)
