import os
import re

styles_dir = '.'
dirs_to_update = ['../pages', '../components', '../']

# Define which CSS goes where
css_map = {
    'admin.css': 'admin',
    'dashboard.css': 'shared',
    'events.css': 'shared',
    'claims.css': 'shared',
    'rewards.css': 'shared',
    'provenance.css': 'admin',
    'profile.css': 'shared',
    'GlobalStyles.css': '',
    'base.css': '',
    'style.css': '',
    'components.css': '',
    'chatbot.css': 'shared',
    'login.css': 'shared',
    'register.css': 'shared'
}

for d in ['admin', 'student', 'verifier', 'shared']:
    os.makedirs(os.path.join(styles_dir, d), exist_ok=True)

moved = {}
for file, folder in css_map.items():
    if folder and os.path.exists(os.path.join(styles_dir, file)):
        old_path = os.path.join(styles_dir, file)
        new_path = os.path.join(styles_dir, folder, file)
        os.rename(old_path, new_path)
        moved[file] = folder

def update_imports(dir_path):
    for root, dirs, files in os.walk(dir_path):
        if 'node_modules' in root or '.git' in root or 'dist' in root:
            continue
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for css_file, folder in moved.items():
                    pattern1 = r"['\"](\.\./)+styles/" + css_file + r"['\"]"
                    pattern2 = r"['\"](\./)+styles/" + css_file + r"['\"]"
                    
                    src_idx = path.find('/src/')
                    if src_idx != -1:
                        jsx_rel_to_src = path[src_idx+5:]
                        depth = jsx_rel_to_src.count('/')
                        prefix = '../' * depth if depth > 0 else './'
                        new_import = f"'{prefix}styles/{folder}/{css_file}'"
                        
                        new_content = re.sub(pattern1, new_import, new_content)
                        new_content = re.sub(pattern2, new_import, new_content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")

for d in dirs_to_update:
    update_imports(d)

print("Done reorganizing CSS")
