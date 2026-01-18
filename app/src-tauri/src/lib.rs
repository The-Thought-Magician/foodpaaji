mod database;
mod types;
mod modules;

use database::init_database;
use modules::employee::{get_employees, create_employee, authenticate_employee, update_employee_password, search_employees};
use modules::employee_images::{upload_employee_image, get_employee_image, delete_employee};
use modules::attendance::{clock_in, clock_out, start_break, end_break, get_attendance_report};
use modules::util::{backup_database, restore_database, seed_sample_data};
use modules::auth::{generate_jwt, verify_jwt};
use modules::fs_check::cross_platform_fs_check;
use modules::menu::{create_menu_category, get_menu_categories, get_menu_category_by_id, update_menu_category, delete_menu_category, create_menu_item, get_menu_items_by_category, get_menu_item_by_id, delete_menu_item};
use modules::menu_images::{upload_menu_item_image, upload_menu_category_image, get_menu_image, delete_menu_item_image, delete_menu_category_image};
use modules::pricing::{calculate_menu_item_price, bulk_calculate_prices, update_menu_item_price, get_pricing_analytics, sync_cost_prices_from_recipes};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_employees,
      create_employee,
      authenticate_employee,
      update_employee_password,
      search_employees,
      upload_employee_image,
      get_employee_image,
      delete_employee,
      clock_in,
      clock_out,
      start_break,
      end_break,
      get_attendance_report,
      backup_database,
      restore_database,
      seed_sample_data,
      generate_jwt,
      verify_jwt,
      cross_platform_fs_check,
      create_menu_category,
      get_menu_categories,
      get_menu_category_by_id,
      update_menu_category,
      delete_menu_category,
      create_menu_item,
      get_menu_items_by_category,
      get_menu_item_by_id,
      delete_menu_item,
      upload_menu_item_image,
      upload_menu_category_image,
      get_menu_image,
      delete_menu_item_image,
      delete_menu_category_image,
      calculate_menu_item_price,
      bulk_calculate_prices,
      update_menu_item_price,
      get_pricing_analytics,
      sync_cost_prices_from_recipes,
    ])
    .setup(|app| {
      // Enable logging in all builds with sensible defaults
      let level = if cfg!(debug_assertions) { log::LevelFilter::Debug } else { log::LevelFilter::Info };
      let builder = tauri_plugin_log::Builder::default().level(level);
      app.handle().plugin(builder.build())?;
      
      let app_handle = app.handle().clone();
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
