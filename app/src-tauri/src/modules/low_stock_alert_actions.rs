use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::Deserialize;
use chrono::Utc;

#[derive(Deserialize)]
pub struct AcknowledgeAlertRequest {
    pub alert_id: i64,
    pub user_id: i64,
    pub restaurant_id: i64,
}

#[derive(Deserialize)]
pub struct BulkAcknowledgeRequest {
    pub restaurant_id: i64,
    pub user_id: i64,
    pub alert_ids: Vec<i64>,
}

#[tauri::command]
pub async fn acknowledge_alert(
    request: AcknowledgeAlertRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let pool = &*db;
    match sqlx::query(
        "UPDATE low_stock_alerts
         SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
         WHERE id = ? AND restaurant_id = ?"
    )
    .bind(request.user_id)
    .bind(Utc::now().naive_utc())
    .bind(request.alert_id)
    .bind(request.restaurant_id)
    .execute(pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(ApiResponse {
                    success: true,
                    data: Some("Alert acknowledged successfully".to_string()),
                    message: Some("Alert acknowledged successfully".to_string()),
                    error: None,
                })
            } else {
                Ok(ApiResponse {
                    success: false, data: None, message: None,
                    error: Some("Alert not found or already acknowledged".to_string()),
                })
            }
        },
        Err(e) => Ok(ApiResponse {
            success: false, data: None, message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn bulk_acknowledge_alerts(
    request: BulkAcknowledgeRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let pool = &*db;
    if request.alert_ids.is_empty() {
        return Ok(ApiResponse {
            success: false, data: None, message: None,
            error: Some("No alert IDs provided".to_string()),
        });
    }

    let placeholders = request.alert_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let query = format!(
        "UPDATE low_stock_alerts
         SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
         WHERE id IN ({}) AND restaurant_id = ?",
        placeholders
    );

    let mut q = sqlx::query(&query)
        .bind(request.user_id)
        .bind(Utc::now().naive_utc());

    for alert_id in &request.alert_ids {
        q = q.bind(alert_id);
    }
    q = q.bind(request.restaurant_id);

    match q.execute(pool).await {
        Ok(result) => {
            let count = result.rows_affected();
            Ok(ApiResponse {
                success: true,
                data: Some(format!("{} alerts acknowledged", count)),
                message: Some(format!("{} alerts acknowledged successfully", count)),
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false, data: None, message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn clear_acknowledged_alerts(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let pool = &*db;
    match sqlx::query(
        "DELETE FROM low_stock_alerts WHERE restaurant_id = ? AND is_acknowledged = 1"
    )
    .bind(restaurant_id)
    .execute(pool)
    .await
    {
        Ok(result) => {
            let count = result.rows_affected();
            Ok(ApiResponse {
                success: true,
                data: Some(format!("{} acknowledged alerts cleared", count)),
                message: Some(format!("{} acknowledged alerts cleared successfully", count)),
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false, data: None, message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn check_and_create_alerts(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let pool = &*db;
    let check_query = "
        INSERT OR REPLACE INTO low_stock_alerts (
            restaurant_id, inventory_item_id, alert_level,
            current_stock, threshold_stock
        )
        SELECT
            restaurant_id, id,
            CASE
                WHEN current_stock <= 0 THEN 'OUT_OF_STOCK'
                WHEN current_stock <= minimum_stock THEN 'CRITICAL'
                ELSE 'LOW'
            END as alert_level,
            current_stock, reorder_point
        FROM inventory_items
        WHERE restaurant_id = ?
        AND current_stock <= reorder_point
        AND is_active = 1";

    match sqlx::query(check_query).bind(restaurant_id).execute(pool).await {
        Ok(result) => {
            let count = result.rows_affected();
            Ok(ApiResponse {
                success: true,
                data: Some(format!("{} alerts checked/created", count)),
                message: Some("Alert check completed successfully".to_string()),
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false, data: None, message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}
