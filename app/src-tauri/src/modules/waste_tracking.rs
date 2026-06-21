use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct WasteEntry {
    pub id: i64,
    pub restaurant_id: i64,
    pub inventory_item_id: Option<i64>,
    pub item_name: String,
    pub quantity: f64,
    pub unit: String,
    pub reason: String,
    pub cost_per_unit: Option<f64>,
    pub notes: Option<String>,
    pub recorded_by: Option<String>,
    pub wasted_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWasteRequest {
    pub inventory_item_id: Option<i64>,
    pub item_name: String,
    pub quantity: f64,
    pub unit: String,
    pub reason: String,
    pub cost_per_unit: Option<f64>,
    pub notes: Option<String>,
    pub recorded_by: Option<String>,
}

#[tauri::command]
pub async fn create_waste_entry(
    request: CreateWasteRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<WasteEntry>, String> {
    match sqlx::query(
        "INSERT INTO waste_entries (restaurant_id, inventory_item_id, item_name, quantity, unit, reason, cost_per_unit, notes, recorded_by)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.inventory_item_id).bind(&request.item_name).bind(request.quantity)
    .bind(&request.unit).bind(&request.reason).bind(request.cost_per_unit)
    .bind(&request.notes).bind(&request.recorded_by)
    .execute(&*db).await {
        Ok(r) => match get_waste_entry_by_id(r.last_insert_rowid(), &db).await {
            Ok(e) => Ok(ApiResponse { success: true, data: Some(e), message: Some("Waste entry recorded".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_waste_entries(
    days: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<WasteEntry>>, String> {
    let d = days.unwrap_or(30);
    match sqlx::query(
        "SELECT id, restaurant_id, inventory_item_id, item_name, quantity, unit, reason,
         cost_per_unit, notes, recorded_by, wasted_at FROM waste_entries
         WHERE wasted_at >= datetime('now', ? || ' days') ORDER BY wasted_at DESC LIMIT 200"
    )
    .bind(format!("-{}", d))
    .fetch_all(&*db).await {
        Ok(rows) => {
            let entries = rows.iter().map(|r| WasteEntry {
                id: r.get("id"), restaurant_id: r.get("restaurant_id"),
                inventory_item_id: r.get("inventory_item_id"), item_name: r.get("item_name"),
                quantity: r.get("quantity"), unit: r.get("unit"), reason: r.get("reason"),
                cost_per_unit: r.get("cost_per_unit"), notes: r.get("notes"),
                recorded_by: r.get("recorded_by"), wasted_at: r.get("wasted_at"),
            }).collect();
            Ok(ApiResponse { success: true, data: Some(entries), message: None, error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_waste_summary(
    days: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let d = days.unwrap_or(30);
    match sqlx::query(
        "SELECT reason, COUNT(*) as count, SUM(quantity) as total_qty,
         SUM(COALESCE(cost_per_unit, 0) * quantity) as total_cost
         FROM waste_entries WHERE wasted_at >= datetime('now', ? || ' days')
         GROUP BY reason ORDER BY total_cost DESC"
    )
    .bind(format!("-{}", d))
    .fetch_all(&*db).await {
        Ok(rows) => {
            let by_reason: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
                "reason": r.get::<String, _>("reason"),
                "count": r.get::<i64, _>("count"),
                "total_qty": r.get::<f64, _>("total_qty"),
                "total_cost": r.get::<f64, _>("total_cost"),
            })).collect();
            let total_cost: f64 = by_reason.iter()
                .filter_map(|v| v["total_cost"].as_f64()).sum();
            Ok(ApiResponse {
                success: true,
                data: Some(serde_json::json!({ "by_reason": by_reason, "total_cost": total_cost, "days": d })),
                message: None, error: None,
            })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

async fn get_waste_entry_by_id(id: i64, db: &DbPool) -> Result<WasteEntry, String> {
    sqlx::query(
        "SELECT id, restaurant_id, inventory_item_id, item_name, quantity, unit, reason,
         cost_per_unit, notes, recorded_by, wasted_at FROM waste_entries WHERE id = ?"
    )
    .bind(id).fetch_one(db).await
    .map(|r| WasteEntry {
        id: r.get("id"), restaurant_id: r.get("restaurant_id"),
        inventory_item_id: r.get("inventory_item_id"), item_name: r.get("item_name"),
        quantity: r.get("quantity"), unit: r.get("unit"), reason: r.get("reason"),
        cost_per_unit: r.get("cost_per_unit"), notes: r.get("notes"),
        recorded_by: r.get("recorded_by"), wasted_at: r.get("wasted_at"),
    })
    .map_err(|e| format!("Database error: {}", e))
}
