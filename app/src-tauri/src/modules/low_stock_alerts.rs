use crate::database::DbPool;
use crate::types::{LowStockAlert, ApiResponse};
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use sqlx::Row;

#[derive(Deserialize)]
pub struct AlertSearchRequest {
    pub restaurant_id: i64,
    pub alert_level: Option<String>,
    pub is_acknowledged: Option<bool>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct AlertResponse {
    pub alerts: Vec<AlertWithItem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct AlertWithItem {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
    pub item_name: String,
    pub item_sku: Option<String>,
    pub alert_level: String,
    pub current_stock: f64,
    pub threshold_stock: f64,
    pub is_acknowledged: bool,
    pub acknowledged_by: Option<i64>,
    pub acknowledged_at: Option<chrono::DateTime<Utc>>,
    pub created_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Serialize)]
pub struct AlertSummary {
    pub total_alerts: i64,
    pub critical_alerts: i64,
    pub low_alerts: i64,
    pub out_of_stock_alerts: i64,
    pub unacknowledged_alerts: i64,
}

#[tauri::command]
pub async fn get_low_stock_alerts(
    request: AlertSearchRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AlertResponse>, String> {
    let pool = &*db;
    let page = request.page.unwrap_or(1);
    let limit = request.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let mut query = "SELECT lsa.id, lsa.restaurant_id, lsa.inventory_item_id, 
                     ii.name as item_name, ii.sku as item_sku, lsa.alert_level, 
                     lsa.current_stock, lsa.threshold_stock, lsa.is_acknowledged, 
                     lsa.acknowledged_by, lsa.acknowledged_at, lsa.created_at
                     FROM low_stock_alerts lsa 
                     JOIN inventory_items ii ON lsa.inventory_item_id = ii.id 
                     WHERE lsa.restaurant_id = ?".to_string();

    let mut count_query = "SELECT COUNT(*) FROM low_stock_alerts lsa 
                          JOIN inventory_items ii ON lsa.inventory_item_id = ii.id 
                          WHERE lsa.restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(alert_level) = &request.alert_level {
        if !alert_level.trim().is_empty() {
            query.push_str(" AND lsa.alert_level = ?");
            count_query.push_str(" AND lsa.alert_level = ?");
            params.push(alert_level.to_uppercase());
        }
    }

    if let Some(is_acknowledged) = request.is_acknowledged {
        query.push_str(" AND lsa.is_acknowledged = ?");
        count_query.push_str(" AND lsa.is_acknowledged = ?");
        params.push((is_acknowledged as i64).to_string());
    }

    query.push_str(" ORDER BY 
        CASE lsa.alert_level 
            WHEN 'OUT_OF_STOCK' THEN 1 
            WHEN 'CRITICAL' THEN 2 
            WHEN 'LOW' THEN 3 
        END, 
        lsa.created_at DESC 
        LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let total_result = sqlx::query_scalar::<_, i64>(&count_query);
    let mut total_query = total_result;
    for param in params.iter().take(params.len() - 2) {
        total_query = total_query.bind(param);
    }

    let alerts_result = sqlx::query_as::<_, AlertWithItem>(&query);
    let mut alerts_query = alerts_result;
    for param in &params {
        alerts_query = alerts_query.bind(param);
    }

    match tokio::try_join!(
        total_query.fetch_one(pool),
        alerts_query.fetch_all(pool)
    ) {
        Ok((total, alerts)) => Ok(ApiResponse {
            success: true,
            data: Some(AlertResponse {
                alerts,
                total,
                page,
                limit,
            }),
            message: None,
            error: None,
        }),
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn get_alert_summary(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AlertSummary>, String> {
    let pool = &*db;
    let summary_query = "
        SELECT 
            COUNT(*) as total_alerts,
            COUNT(CASE WHEN alert_level = 'CRITICAL' THEN 1 END) as critical_alerts,
            COUNT(CASE WHEN alert_level = 'LOW' THEN 1 END) as low_alerts,
            COUNT(CASE WHEN alert_level = 'OUT_OF_STOCK' THEN 1 END) as out_of_stock_alerts,
            COUNT(CASE WHEN is_acknowledged = 0 THEN 1 END) as unacknowledged_alerts
        FROM low_stock_alerts 
        WHERE restaurant_id = ?";

    match sqlx::query(summary_query)
        .bind(restaurant_id)
        .fetch_one(pool)
        .await
    {
        Ok(row) => {
            let total_alerts: i64 = row.try_get("total_alerts")
                .map_err(|e| format!("Failed to get total_alerts: {}", e))?;
            let critical_alerts: i64 = row.try_get("critical_alerts")
                .map_err(|e| format!("Failed to get critical_alerts: {}", e))?;
            let low_alerts: i64 = row.try_get("low_alerts")
                .map_err(|e| format!("Failed to get low_alerts: {}", e))?;
            let out_of_stock_alerts: i64 = row.try_get("out_of_stock_alerts")
                .map_err(|e| format!("Failed to get out_of_stock_alerts: {}", e))?;
            let unacknowledged_alerts: i64 = row.try_get("unacknowledged_alerts")
                .map_err(|e| format!("Failed to get unacknowledged_alerts: {}", e))?;

            let summary = AlertSummary {
                total_alerts,
                critical_alerts,
                low_alerts,
                out_of_stock_alerts,
                unacknowledged_alerts,
            };

            Ok(ApiResponse {
                success: true,
                data: Some(summary),
                message: None,
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[derive(Deserialize)]
pub struct AcknowledgeAlertRequest {
    pub alert_id: i64,
    pub user_id: i64,
    pub restaurant_id: i64,
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
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Alert not found or already acknowledged".to_string()),
                })
            }
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[derive(Deserialize)]
pub struct BulkAcknowledgeRequest {
    pub restaurant_id: i64,
    pub user_id: i64,
    pub alert_ids: Vec<i64>,
}

#[tauri::command]
pub async fn bulk_acknowledge_alerts(
    request: BulkAcknowledgeRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let pool = &*db;
    if request.alert_ids.is_empty() {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
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

    let mut query_builder = sqlx::query(&query)
        .bind(request.user_id)
        .bind(Utc::now().naive_utc());

    for alert_id in &request.alert_ids {
        query_builder = query_builder.bind(alert_id);
    }
    query_builder = query_builder.bind(request.restaurant_id);

    match query_builder.execute(pool).await {
        Ok(result) => {
            let acknowledged_count = result.rows_affected();
            Ok(ApiResponse {
                success: true,
                data: Some(format!("{} alerts acknowledged", acknowledged_count)),
                message: Some(format!("{} alerts acknowledged successfully", acknowledged_count)),
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
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
        "DELETE FROM low_stock_alerts
         WHERE restaurant_id = ? AND is_acknowledged = 1"
    )
    .bind(restaurant_id)
    .execute(pool)
    .await
    {
        Ok(result) => {
            let cleared_count = result.rows_affected();
            Ok(ApiResponse {
                success: true,
                data: Some(format!("{} acknowledged alerts cleared", cleared_count)),
                message: Some(format!("{} acknowledged alerts cleared successfully", cleared_count)),
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
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

    match sqlx::query(check_query)
        .bind(restaurant_id)
        .execute(pool)
        .await
    {
        Ok(result) => {
            let alerts_created = result.rows_affected();
            Ok(ApiResponse {
                success: true,
                data: Some(format!("{} alerts checked/created", alerts_created)),
                message: Some("Alert check completed successfully".to_string()),
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}