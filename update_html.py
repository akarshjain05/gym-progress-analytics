import glob

for filepath in glob.glob("frontend/*.html"):
    with open(filepath, "r") as f:
        content = f.read()
    
    if "api.js?v=11" in content:
        content = content.replace("api.js?v=11", "api.js?v=12")
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Updated {filepath}")
