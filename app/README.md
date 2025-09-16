# FoodPaaji App (React + Vite + Tauri)

Quickstart
- Install prerequisites
  - Node.js 20+
  - Rust toolchain (stable)
  - Tauri CLI: npm i -g @tauri-apps/cli
  - Linux build deps (Ubuntu/Debian): sudo apt update && sudo apt install -y pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev
- Dev
  - npm run dev (starts Tauri with Vite HMR)
- Build
  - npm run build

Scripts
- frontend:dev — Vite dev server only
- frontend:build — Vite build only

Environment
- FOODPAAJI_JWT_SECRET — required for JWT commands
- FOODPAAJI_DEV_PASSWORD — optional dev seed password (default: devpass123)

Tauri Commands (dev helpers)
- seed_sample_data — inserts demo restaurant and user
- backup_database, restore_database — copy DB backups
- cross_platform_fs_check — validates data-dir R/W
- generate_jwt, verify_jwt — auth primitives

Notes
- Logging: tauri-plugin-log enabled (stdout/webview in dev; file in release)
- CSP: restrictive defaults are set in tauri.conf.json; adjust if loading external resources.
    languageOptions: {
