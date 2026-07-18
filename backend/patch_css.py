import os, glob

css_dir = r'C:\Users\venka\mf_creater\knowledgeforge\frontend\src\assets\comic-css'
files = glob.glob(os.path.join(css_dir, '*.css'))

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Simple replacement to ensure color: #111 !important; is added
    if 'speech-bubble {' in content:
        content = content.replace('speech-bubble {\n', 'speech-bubble {\n  color: #111 !important;\n')
    else:
        # Some might be speech-bubble { ... inline
        content = content.replace('speech-bubble {', 'speech-bubble { color: #111 !important;')
        
    with open(f, 'w') as file:
        file.write(content)

print('Updated CSS text colors')
