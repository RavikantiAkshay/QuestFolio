import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Scale the armory wall
content = re.sub(
    r'(<div class=\"armory-wall\" style=\".*?)(; box-shadow:)', 
    r'\1; transform: scale(0.85); margin-top: 20px\2', 
    content
)

# Fix armory items
content = re.sub(
    r'(<div class=\"armory-item group relative\" style=\".*?)padding-bottom: 5px;(\">)', 
    r'\1padding-bottom: 0px;\2', 
    content
)

# Put tags on the rack
content = re.sub(
    r'(<div class=\"armory-tag\" style=\")(.*?margin-top: 10px;)(\">)', 
    lambda m: m.group(1) + m.group(2).replace('margin-top: 10px;', 'position: absolute; bottom: -20px; z-index: 5;') + m.group(3),
    content
)

# Fix top row tooltips just in case to show to the right
count = [0]
def tooltip_replacer(m):
    count[0] += 1
    if count[0] <= 4:
        return m.group(1) + 'top: -20px; left: 100%; margin-left: 20px;' + m.group(2)
    return m.group(0)

content = re.sub(
    r'(<div class=\"armory-tooltip\" style=\"position: absolute; )bottom: 120%;(.*?\">)',
    tooltip_replacer,
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Adjustments made!')
