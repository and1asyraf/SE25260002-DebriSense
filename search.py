with open('app.py', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'api/' in line or 'def get_all_reports' in line:
            print(f"{i+1}: {line.strip()}")
