mod database;
mod types;
mod modules;

use database::init_database;
use modules::employee::{get_employees, create_employee, search_employees, update_employee};
use modules::employee_auth::{authenticate_employee, update_employee_password};
use modules::employee_images::{upload_employee_image, get_employee_image, delete_employee};
use modules::attendance::{clock_in, clock_out, get_on_duty_staff};
use modules::attendance_breaks::{start_break, end_break, get_attendance_report};
use modules::util::{backup_database, restore_database, seed_sample_data};
use modules::auth::{generate_jwt, verify_jwt};
use modules::fs_check::cross_platform_fs_check;
use modules::inventory::{get_inventory_items, search_inventory_items, create_inventory_item, bulk_update_inventory_items, update_inventory_item, delete_inventory_item};
use modules::inventory_suppliers::{get_inventory_categories, create_inventory_category, get_suppliers, create_supplier};
use modules::stock_movements::create_stock_movement;
use modules::stock_movement_queries::{get_stock_movements, adjust_stock_level, get_expiring_stock};
use modules::low_stock_alerts::{get_low_stock_alerts, get_alert_summary};
use modules::low_stock_alert_actions::{acknowledge_alert, bulk_acknowledge_alerts, clear_acknowledged_alerts, check_and_create_alerts};
use modules::unit_conversions::{get_unit_conversions, create_unit_conversion};
use modules::unit_conversion_tools::{convert_units, get_available_units, setup_default_conversions};
use modules::inventory_valuation::calculate_inventory_valuation;
use modules::inventory_valuation_methods::compare_valuation_methods;
use modules::inventory_reports::{get_stock_summary_report, get_movement_report, get_low_stock_report, get_purchase_order_suggestions};
use modules::inventory_analytics::{get_inventory_analytics, get_top_moving_items_report, get_slow_moving_items_report};
use modules::auto_stock_deduction::process_order_completion;
use modules::menu_recipes::{validate_stock_availability, create_menu_recipe, get_menu_recipe};
use modules::inventory_transfers::{create_inventory_transfer, approve_transfer, complete_transfer};
use modules::inventory_transfer_search::get_inventory_transfers;
use modules::menu::{create_menu_category, get_menu_categories, get_menu_category_by_id, update_menu_category, delete_menu_category, get_popular_menu_items};
use modules::menu_items::{create_menu_item, get_menu_items_by_category, get_menu_item_by_id, delete_menu_item, update_menu_item};
use modules::menu_images::{upload_menu_item_image, upload_menu_category_image};
use modules::menu_image_management::{get_menu_image, delete_menu_item_image, delete_menu_category_image};
use modules::pricing::{calculate_menu_item_price, update_menu_item_price};
use modules::pricing_bulk::{bulk_calculate_prices, get_pricing_analytics, sync_cost_prices_from_recipes};
use modules::billing::{create_bill, get_bills, get_bill_details, update_bill_status, record_payment, get_billing_summary, get_payment_method_summary, get_gst_report, get_hourly_sales};
use modules::customers::{create_customer, get_customers, get_customer, update_customer, delete_customer, add_loyalty_points, redeem_loyalty_points, get_customer_stats};
use modules::reservations::{get_tables, create_table, create_reservation, get_reservations, update_reservation_status, update_reservation, get_table_availability};
use modules::promotions::{create_promotion, get_promotions, validate_promo_code, apply_promo, toggle_promotion, create_announcement, get_announcements, dismiss_announcement};
use modules::orders::{create_order, get_orders, get_order_details, update_order_status, convert_order_to_bill, get_kitchen_stats};
use modules::receipts::{generate_receipt, mark_receipt_printed, get_receipt};
use modules::coupons::{create_coupon, validate_coupon, apply_coupon, get_coupons, toggle_coupon};
use modules::feedback::{create_feedback, get_customer_feedback, get_feedback_summary};
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
      update_employee,
      upload_employee_image,
      get_employee_image,
      delete_employee,
      clock_in,
      clock_out,
      get_on_duty_staff,
      start_break,
      end_break,
      get_attendance_report,
      backup_database,
      restore_database,
      seed_sample_data,
      generate_jwt,
      verify_jwt,
      cross_platform_fs_check,
      get_inventory_items,
      search_inventory_items,
      create_inventory_item,
      get_inventory_categories,
      create_inventory_category,
      get_suppliers,
      create_supplier,
      bulk_update_inventory_items,
      update_inventory_item,
      delete_inventory_item,
      create_stock_movement,
      get_stock_movements,
      adjust_stock_level,
      get_expiring_stock,
      get_low_stock_alerts,
      get_alert_summary,
      acknowledge_alert,
      bulk_acknowledge_alerts,
      clear_acknowledged_alerts,
      check_and_create_alerts,
      get_unit_conversions,
      create_unit_conversion,
      convert_units,
      get_available_units,
      setup_default_conversions,
      calculate_inventory_valuation,
      compare_valuation_methods,
      get_stock_summary_report,
      get_movement_report,
      get_low_stock_report,
      get_purchase_order_suggestions,
      get_inventory_analytics,
      get_top_moving_items_report,
      get_slow_moving_items_report,
      process_order_completion,
      validate_stock_availability,
      create_menu_recipe,
      get_menu_recipe,
      create_inventory_transfer,
      approve_transfer,
      complete_transfer,
      get_inventory_transfers,
      create_menu_category,
      get_menu_categories,
      get_menu_category_by_id,
      update_menu_category,
      delete_menu_category,
      get_popular_menu_items,
      create_menu_item,
      get_menu_items_by_category,
      get_menu_item_by_id,
      delete_menu_item,
      update_menu_item,
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
      create_bill,
      get_bills,
      get_bill_details,
      update_bill_status,
      record_payment,
      get_billing_summary,
      get_payment_method_summary,
      get_gst_report,
      get_hourly_sales,
      create_customer,
      get_customers,
      get_customer,
      update_customer,
      delete_customer,
      add_loyalty_points,
      redeem_loyalty_points,
      get_customer_stats,
      get_tables,
      create_table,
      create_reservation,
      get_reservations,
      update_reservation_status,
      update_reservation,
      get_table_availability,
      create_promotion,
      get_promotions,
      validate_promo_code,
      apply_promo,
      toggle_promotion,
      create_announcement,
      get_announcements,
      dismiss_announcement,
      create_order,
      get_orders,
      get_order_details,
      update_order_status,
      convert_order_to_bill,
      get_kitchen_stats,
      generate_receipt,
      mark_receipt_printed,
      get_receipt,
      create_coupon,
      validate_coupon,
      apply_coupon,
      get_coupons,
      toggle_coupon,
      create_feedback,
      get_customer_feedback,
      get_feedback_summary,
    ])
    .setup(|app| {
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
