use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WalkinEntry {
    pub id: i64,
    pub customer_name: String,
    pub phone: Option<String>,
    pub party_size: i64,
    pub status: String,
    pub notes: Option<String>,
    pub table_number: Option<String>,
    pub added_at: String,
    pub seated_at: Option<String>,
    pub estimated_wait: Option<i64>,
    pub wait_minutes: i64,
}

#[derive(Debug, Deserialize)]
pub struct AddWalkinRequest {
    pub customer_name: String,
    pub phone: Option<String>,
    pub party_size: i64,
    pub notes: Option<String>,
    pub estimated_wait: Option<i64>,
}

#[tauri::command]
pub async fn get_walkin_queue(db: State<'_, DbPool>) -> Result<ApiResponse<Vec<WalkinEntry>>, String> {
    match sqlx::query(
        "SELECT id, customer_name, phone, party_size, status, notes, table_number,
         added_at, seated_at, estimated_wait,
         CAST((julianday('now') - julianday(added_at)) * 1440 AS INTEGER) as wait_minutes
         FROM walkin_queue WHERE status = 'waiting' ORDER BY added_at ASC"
    ).fetch_all(&*db).await {
        Ok(rows) => Ok(ApiResponse {
            success: true,
            data: Some(rows.iter().map(|r| WalkinEntry {
                id: r.get("id"), customer_name: r.get("customer_name"),
                phone: r.get("phone"), party_size: r.get("party_size"),
                status: r.get("status"), notes: r.get("notes"),
                table_number: r.get("table_number"), added_at: r.get("added_at"),
                seated_at: r.get("seated_at"), estimated_wait: r.get("estimated_wait"),
                wait_minutes: r.get("wait_minutes"),
            }).collect()),
            message: None, error: None,
        }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn add_to_walkin_queue(
    request: AddWalkinRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<WalkinEntry>, String> {
    match sqlx::query(
        "INSERT INTO walkin_queue (customer_name, phone, party_size, notes, estimated_wait) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&request.customer_name).bind(&request.phone).bind(request.party_size)
    .bind(&request.notes).bind(request.estimated_wait)
    .execute(&*db).await {
        Ok(r) => {
            let id = r.last_insert_rowid();
            match sqlx::query(
                "SELECT id, customer_name, phone, party_size, status, notes, table_number, added_at, seated_at, estimated_wait, 0 as wait_minutes FROM walkin_queue WHERE id = ?"
            ).bind(id).fetch_one(&*db).await {
                Ok(row) => Ok(ApiResponse { success: true, data: Some(WalkinEntry {
                    id: row.get("id"), customer_name: row.get("customer_name"),
                    phone: row.get("phone"), party_size: row.get("party_size"),
                    status: row.get("status"), notes: row.get("notes"),
                    table_number: row.get("table_number"), added_at: row.get("added_at"),
                    seated_at: row.get("seated_at"), estimated_wait: row.get("estimated_wait"),
                    wait_minutes: 0,
                }), message: Some("Added to queue".to_string()), error: None }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
            }
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn seat_walkin_guest(
    entry_id: i64,
    table_number: Option<String>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query(
        "UPDATE walkin_queue SET status = 'seated', table_number = ?, seated_at = datetime('now') WHERE id = ?"
    ).bind(&table_number).bind(entry_id).execute(&*db).await {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Guest seated".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn update_walkin_status(
    entry_id: i64,
    status: String,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query("UPDATE walkin_queue SET status = ? WHERE id = ?")
        .bind(&status).bind(entry_id).execute(&*db).await {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Status updated".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
