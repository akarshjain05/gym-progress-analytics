import glob

html_files = glob.glob('frontend/*.html')

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    if '<script src="/js/api.js' in content and '<script src="/js/share.js' not in content:
        content = content.replace('<script src="/js/api.js', '<script src="/js/share.js?v=1"></script>\n  <script src="/js/api.js')
        with open(filepath, 'w') as f:
            f.write(content)
