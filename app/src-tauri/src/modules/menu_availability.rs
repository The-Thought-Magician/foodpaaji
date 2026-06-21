use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AvailabilitySlot {
    pub id: i64,
    pub menu_item_id: i64,
    pub day_of_week: i64,
    pub start_time: String,
    pub end_time: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateAvailabilityRequest {
    pub day_of_week: i64,
    pub start_time: String,
    pub end_time: String,
}

#[tauri::command]
pub async fn get_item_availability(
    menu_item_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<AvailabilitySlot>>, String> {
    match sqlx::query(
        "SELECT id, menu_item_id, day_of_week, start_time, end_time, is_active
         FROM menu_item_availability WHERE menu_item_id = ? ORDER BY day_of_week, start_time"
    ).bind(menu_item_id).fetch_all(&*db).await {
        Ok(rows) => Ok(ApiResponse {
            success: true,
            data: Some(rows.iter().map(|r| AvailabilitySlot {
                id: r.get("id"), menu_item_id: r.get("menu_item_id"),
                day_of_week: r.get("day_of_week"), start_time: r.get("start_time"),
                end_time: r.get("end_time"), is_active: r.get("is_active"),
            }).collect()),
            message: None, error: None,
        }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn add_availability_slot(
    menu_item_id: i64,
    request: CreateAvailabilityRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AvailabilitySlot>, String> {
    match sqlx::query(
        "INSERT INTO menu_item_availability (menu_item_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)"
    )
    .bind(menu_item_id).bind(request.day_of_week).bind(&request.start_time).bind(&request.end_time)
    .execute(&*db).await {
        Ok(r) => Ok(ApiResponse {
            success: true,
            data: Some(AvailabilitySlot {
                id: r.last_insert_rowid(), menu_item_id,
                day_of_week: request.day_of_week, start_time: request.start_time,
                end_time: request.end_time, is_active: true,
            }),
            message: Some("Availability slot added".to_string()), error: None,
        }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn remove_availability_slot(
    slot_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query("DELETE FROM menu_item_availability WHERE id = ?").bind(slot_id).execute(&*db).await {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Slot removed".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
