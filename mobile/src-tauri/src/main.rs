// Prevents the extra terminal window from popping up on Windows
// release builds. `not(debug_assertions)` keeps the console alive in
// dev so Rust panics + Tauri logs are visible.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    figurepinner_lib::run()
}
