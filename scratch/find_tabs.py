with open('src/App.tsx', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'settingsTab ===' in line or 'tab ===' in line:
            print(f'{i+1}: {line.strip()[:100]}')
