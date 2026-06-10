import os

for root, dirs, files in os.walk("."):
    if "venv" in root or ".git" in root or "__pycache__" in root:
        continue
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            try:
                content = open(path, "r", encoding="utf-8").read()
                if "SITE_URL" in content:
                    print(f"Found in {path}")
                    for i, line in enumerate(content.split("\n")):
                        if "SITE_URL" in line:
                            print(f"  Line {i+1}: {line.strip()}")
            except Exception:
                pass
