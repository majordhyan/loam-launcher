with open('src/App.tsx', 'r', encoding='utf-8', newline='') as f:
    text = f.read()

target = 'return (localStorage.getItem("loam_theme") as "system" | "light" | "dark") || "system";'
replacement = 'if (isDemo || window.location.search.includes("theme=light")) return "light";\r\n      return (localStorage.getItem("loam_theme") as "system" | "light" | "dark") || "light";'

assert target in text, 'target not found'
text = text.replace(target, replacement, 1)

with open('src/App.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print('THEME UPDATED')
