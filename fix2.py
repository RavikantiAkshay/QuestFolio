import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add position: relative to armory-item styles
content = re.sub(
    r'(<div class=\"armory-item[^\"]*\" style=\")(.*?)(\">)', 
    r'\1position: relative; \2\3', 
    content
)

# Also fix the image scaling. Let's add transform: scale(1.5); to images to make them bigger.
content = re.sub(
    r'(<img src=\"assets/images/items/[^\"]+\".*?style=\")(.*?)(\">)',
    r'\1\2 transform: scale(1.8);\3',
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed positions and scaling!')
