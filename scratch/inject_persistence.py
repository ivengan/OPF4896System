import os
import glob

html_files = glob.glob('c:/Projects/OPF4896System/*.html')
count = 0

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'const db = firebase.firestore();' in content and 'enablePersistence' not in content:
        new_content = content.replace(
            'const db = firebase.firestore();',
            "const db = firebase.firestore();\n        db.enablePersistence({ synchronizeTabs: true }).catch(err => console.log('Offline persistence error:', err.code));"
        )
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
        print(f"Injected into {file}")

print(f"Total files updated: {count}")
