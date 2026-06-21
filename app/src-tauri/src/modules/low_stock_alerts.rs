use crate::database::DbPool;
use crate::types::ApiResponse;
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
    pub supplier_name: Option<String>,
    pub supplier_phone: Option<String>,
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
                     ii.name as item_name, ii.sku as item_sku,
                     s.name as supplier_name, s.phone as supplier_phone,
                     lsa.alert_level, lsa.current_stock, lsa.threshold_stock,
                     lsa.is_acknowledged, lsa.acknowledged_by, lsa.acknowledged_at, lsa.created_at
                     FROM low_stock_alerts lsa
                     JOIN inventory_items ii ON lsa.inventory_item_id = ii.id
                     LEFT JOIN suppliers s ON ii.supplier_id = s.id
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
            data: Some(AlertResponse { alerts, total, page, limit }),
            message: None,
            error: None,
        }),
        Err(e) => Ok(ApiResponse {
            success: false, data: None, message: None,
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

    match sqlx::query(summary_query).bind(restaurant_id).fetch_one(pool).await {
        Ok(row) => {
            let summary = AlertSummary {
                total_alerts: row.try_get("total_alerts").map_err(|e| e.to_string())?,
                critical_alerts: row.try_get("critical_alerts").map_err(|e| e.to_string())?,
                low_alerts: row.try_get("low_alerts").map_err(|e| e.to_string())?,
                out_of_stock_alerts: row.try_get("out_of_stock_alerts").map_err(|e| e.to_string())?,
                unacknowledged_alerts: row.try_get("unacknowledged_alerts").map_err(|e| e.to_string())?,
            };
            Ok(ApiResponse { success: true, data: Some(summary), message: None, error: None })
        },
        Err(e) => Ok(ApiResponse {
            success: false, data: None, message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}
