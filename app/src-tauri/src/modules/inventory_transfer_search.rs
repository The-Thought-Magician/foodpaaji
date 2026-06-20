use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::inventory_transfers::InventoryTransfer;
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct TransferSearchRequest {
    pub restaurant_id: i64,
    pub status: Option<String>,
    pub from_location: Option<String>,
    pub to_location: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct TransferSearchResponse {
    pub transfers: Vec<InventoryTransfer>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[tauri::command]
pub async fn get_inventory_transfers(
    request: TransferSearchRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<TransferSearchResponse>, String> {
    let page = request.page.unwrap_or(1);
    let limit = request.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let mut query = "SELECT id, restaurant_id, transfer_number, from_location, to_location, \
                     status, requested_by, approved_by, completed_by, notes, total_items, \
                     total_value, requested_at, approved_at, completed_at, created_at \
                     FROM inventory_transfers WHERE restaurant_id = ?".to_string();
    let mut count_query = "SELECT COUNT(*) FROM inventory_transfers WHERE restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(status) = &request.status {
        if !status.trim().is_empty() {
            query.push_str(" AND status = ?");
            count_query.push_str(" AND status = ?");
            params.push(status.to_uppercase());
        }
    }
    if let Some(from) = &request.from_location {
        if !from.trim().is_empty() {
            query.push_str(" AND from_location = ?");
            count_query.push_str(" AND from_location = ?");
            params.push(from.clone());
        }
    }
    if let Some(to) = &request.to_location {
        if !to.trim().is_empty() {
            query.push_str(" AND to_location = ?");
            count_query.push_str(" AND to_location = ?");
            params.push(to.clone());
        }
    }
    query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let mut total_query = sqlx::query_scalar::<_, i64>(&count_query);
    for param in params.iter().take(params.len() - 2) { total_query = total_query.bind(param); }
    let mut transfers_query = sqlx::query_as::<_, InventoryTransfer>(&query);
    for param in &params { transfers_query = transfers_query.bind(param); }

    match tokio::try_join!(total_query.fetch_one(&*db), transfers_query.fetch_all(&*db)) {
        Ok((total, transfers)) => Ok(ApiResponse {
            success: true,
            data: Some(TransferSearchResponse { transfers, total, page, limit }),
            message: None, error: None,
        }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
