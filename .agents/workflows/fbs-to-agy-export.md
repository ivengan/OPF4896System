---
description: Export and Link Firebase project for Antigravity (fbs-to-agy-export)
---
This workflow configures the Firebase project automatically so you don't have to manually link it on the new laptop.

// turbo-all
1. Create Firebase configuration file
```powershell
Set-Content -Path firebase.json -Value '{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}'
```

2. Create Firebase RC file to link the project
```powershell
Set-Content -Path .firebaserc -Value '{
  "projects": {
    "default": "opf4896system"
  }
}'
```

3. Initialize npm package to track dependencies
```powershell
npm init -y
```

4. Install Firebase CLI locally so it is ready on the new laptop
```powershell
npm install firebase-tools --save-dev
```
