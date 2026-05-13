// Library entry — Tauri's bootstrap. The window itself is configured
// in tauri.conf.json (size, decorations, CSP). This is intentionally
// thin: the React app is the entire UI; Rust only owns the window
// shell + the system tray hooks that a v2 follow-up could add.
//
// Wire a tauri::Builder::command here when mobile needs to call into
// native APIs the browser can't expose (e.g. true OS push notifications
// or a system-tray icon). For week-1 the browser surface covers
// everything we need.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
