use crate::database::DbPool;
use crate::types::{CreateStockMovementRequest, ApiResponse};
use crate::modules::stock_movements::{MovementType, create_stock_movement};
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Deserialize)]
pub struct StockMovementSearchRequest {
    pub restaurant_id: i64,
    pub inventory_item_id: Option<i64>,
    pub movement_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct StockMovementResponse {
    pub movements: Vec<StockMovementWithItem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct StockMovementWithItem {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
    pub item_name: String,
    pub item_sku: Option<String>,
    pub movement_type: String,
    pub quantity: f64,
    pub unit_cost: Option<f64>,
    pub total_cost: Option<f64>,
    pub reference_type: Option<String>,
    pub reference_id: Option<i64>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub notes: Option<String>,
    pub user_id: Option<i64>,
    pub movement_date: Option<chrono::DateTime<Utc>>,
    pub created_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Deserialize)]
pub struct StockAdjustmentRequest {
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
    pub new_stock_level: f64,
    pub reason: String,
    pub user_id: i64,
}

#[tauri::command]
pub async fn get_stock_movements(
    request: StockMovementSearchRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<StockMovementResponse>, String> {
    let page = request.page.unwrap_or(1);
    let limit = request.limit.unwrap_or(50);
    let offset = (page - 1) * limit;

    let mut query = "SELECT sm.id, sm.restaurant_id, sm.inventory_item_id, ii.name as item_name,
                     ii.sku as item_sku, sm.movement_type, sm.quantity, sm.unit_cost,
                     sm.total_cost, sm.reference_type, sm.reference_id, sm.batch_number,
                     sm.expiry_date, sm.notes, sm.user_id, sm.movement_date, sm.created_at
                     FROM stock_movements sm
                     JOIN inventory_items ii ON sm.inventory_item_id = ii.id
                     WHERE sm.restaurant_id = ?".to_string();

    let mut count_query = "SELECT COUNT(*) FROM stock_movements sm
                          JOIN inventory_items ii ON sm.inventory_item_id = ii.id
                          WHERE sm.restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(item_id) = request.inventory_item_id {
        query.push_str(" AND sm.inventory_item_id = ?");
        count_query.push_str(" AND sm.inventory_item_id = ?");
        params.push(item_id.to_string());
    }
    if let Some(mt) = &request.movement_type {
        if !mt.trim().is_empty() {
            query.push_str(" AND sm.movement_type = ?");
            count_query.push_str(" AND sm.movement_type = ?");
            params.push(mt.to_uppercase());
        }
    }
    if let Some(sd) = &request.start_date {
        query.push_str(" AND DATE(sm.movement_date) >= ?");
        count_query.push_str(" AND DATE(sm.movement_date) >= ?");
        params.push(sd.clone());
    }
    if let Some(ed) = &request.end_date {
        query.push_str(" AND DATE(sm.movement_date) <= ?");
        count_query.push_str(" AND DATE(sm.movement_date) <= ?");
        params.push(ed.clone());
    }

    query.push_str(" ORDER BY sm.movement_date DESC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let mut total_q = sqlx::query_scalar::<_, i64>(&count_query);
    for p in params.iter().take(params.len() - 2) { total_q = total_q.bind(p); }

    let mut movements_q = sqlx::query_as::<_, StockMovementWithItem>(&query);
    for p in &params { movements_q = movements_q.bind(p); }

    match tokio::try_join!(total_q.fetch_one(&*db), movements_q.fetch_all(&*db)) {
        Ok((total, movements)) => Ok(ApiResponse {
            success: true,
            data: Some(StockMovementResponse { movements, total, page, limit }),
            message: None, error: None,
        }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) })
    }
}

#[tauri::command]
pub async fn adjust_stock_level(
    request: StockAdjustmentRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let current = sqlx::query_scalar::<_, f64>(
        "SELECT current_stock FROM inventory_items WHERE id = ? AND restaurant_id = ?"
    )
    .bind(request.inventory_item_id).bind(request.restaurant_id)
    .fetch_optional(&*db).await;

    match current {
        Ok(Some(current_stock)) => {
            let diff = request.new_stock_level - current_stock;
            if diff == 0.0 {
                return Ok(ApiResponse { success: true, data: Some("No adjustment needed".to_string()), message: Some("Current stock level matches target level".to_string()), error: None });
            }
            match create_stock_movement(CreateStockMovementRequest {
                restaurant_id: request.restaurant_id,
                inventory_item_id: request.inventory_item_id,
                movement_type: MovementType::Adjustment.as_str().to_string(),
                quantity: diff.abs(), unit_cost: None,
                reference_type: Some("MANUAL_ADJUSTMENT".to_string()),
                reference_id: None, batch_number: None, expiry_date: None,
                notes: Some(request.reason), user_id: Some(request.user_id),
            }, db).await {
                Ok(r) if r.success => Ok(ApiResponse { success: true, data: Some(format!("Stock adjusted by {:.2} units", diff)), message: Some("Stock level adjusted successfully".to_string()), error: None }),
                Ok(r) => Ok(ApiResponse { success: false, data: None, message: None, error: r.error.or(Some("Failed to create stock movement".to_string())) }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Failed to adjust stock: {}", e)) }),
            }
        },
        Ok(None) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("Inventory item not found".to_string()) }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_expiring_stock(pool: State<'_, sqlx::SqlitePool>, restaurant_id: i64, days_ahead: Option<i64>) -> Result<serde_json::Value, String> {
    let days = days_ahead.unwrap_or(7);
    let rows = sqlx::query(
        "SELECT sm.id, sm.inventory_item_id, ii.name as item_name, sm.quantity, sm.batch_number, sm.expiry_date, sm.movement_date
         FROM stock_movements sm
         JOIN inventory_items ii ON sm.inventory_item_id = ii.id
         WHERE sm.restaurant_id = ?
           AND sm.movement_type = 'IN'
           AND sm.expiry_date IS NOT NULL
           AND sm.expiry_date >= date('now')
           AND sm.expiry_date <= date('now', ? || ' days')
           AND sm.quantity > 0
         ORDER BY sm.expiry_date ASC
         LIMIT 50"
    )
    .bind(restaurant_id)
    .bind(format!("+{}", days))
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let data: Vec<serde_json::Value> = rows.into_iter().map(|r| {
        use sqlx::Row;
        serde_json::json!({
            "id": r.try_get::<i64,_>("id").unwrap_or(0),
            "inventory_item_id": r.try_get::<i64,_>("inventory_item_id").unwrap_or(0),
            "item_name": r.try_get::<String,_>("item_name").unwrap_or_default(),
            "quantity": r.try_get::<f64,_>("quantity").unwrap_or(0.0),
            "batch_number": r.try_get::<Option<String>,_>("batch_number").unwrap_or(None),
            "expiry_date": r.try_get::<String,_>("expiry_date").unwrap_or_default(),
        })
    }).collect();
    Ok(serde_json::json!({ "success": true, "data": data }))
}
