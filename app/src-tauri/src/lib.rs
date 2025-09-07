mod database;
mod types;
mod modules;

use database::init_database;
use modules::employee::{get_employees, create_employee};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_employees,
      create_employee
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      let app_handle = app.handle();
      tauri::async_runtime::spawn(async move {
        match init_database().await {
          Ok(pool) => {
            app_handle.manage(pool);
            log::info!("Database pool managed by Tauri");
          },
          Err(e) => {
            log::error!("Failed to initialize database: {}", e);
          }
        }
      });
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
