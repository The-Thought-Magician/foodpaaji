use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::inventory_reports::{ReportRequest, parse_date_to_i64};
use tauri::State;
use serde::Serialize;
use sqlx::Row;

#[derive(Serialize)]
pub struct InventoryAnalytics {
    pub total_items: i64,
    pub total_inventory_value: f64,
    pub low_stock_items: i64,
    pub out_of_stock_items: i64,
    pub overstocked_items: i64,
    pub total_categories: i64,
    pub average_stock_level: f64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct TopMovingItemsReport {
    pub item_id: i64,
    pub item_name: String,
    pub total_quantity_out: f64,
    pub total_value_out: f64,
    pub movement_frequency: i64,
    pub rank: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct SlowMovingItemsReport {
    pub item_id: i64,
    pub item_name: String,
    pub current_stock: f64,
    pub days_since_last_movement: Option<i64>,
    pub total_value: f64,
    pub last_movement_date: Option<String>,
}

#[tauri::command]
pub async fn get_inventory_analytics(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<InventoryAnalytics>, String> {
    match tokio::try_join!(
        sqlx::query(
            "SELECT COUNT(*) as total_items,
             SUM(current_stock * cost_price) as total_inventory_value,
             COUNT(CASE WHEN current_stock <= reorder_point AND current_stock > 0 THEN 1 END) as low_stock_items,
             COUNT(CASE WHEN current_stock <= 0 THEN 1 END) as out_of_stock_items,
             COUNT(CASE WHEN current_stock > maximum_stock THEN 1 END) as overstocked_items,
             AVG(current_stock) as average_stock_level
             FROM inventory_items WHERE restaurant_id = ? AND is_active = 1"
        ).bind(restaurant_id).fetch_one(&*db),
        sqlx::query(
            "SELECT COUNT(DISTINCT category_id) as total_categories FROM inventory_items WHERE restaurant_id = ? AND is_active = 1 AND category_id IS NOT NULL"
        ).bind(restaurant_id).fetch_one(&*db)
    ) {
        Ok((ar, cr)) => {
            let analytics = InventoryAnalytics {
                total_items: ar.try_get("total_items").map_err(|e| e.to_string())?,
                total_inventory_value: ar.try_get("total_inventory_value").unwrap_or(0.0),
                low_stock_items: ar.try_get("low_stock_items").map_err(|e| e.to_string())?,
                out_of_stock_items: ar.try_get("out_of_stock_items").map_err(|e| e.to_string())?,
                overstocked_items: ar.try_get("overstocked_items").map_err(|e| e.to_string())?,
                total_categories: cr.try_get("total_categories").map_err(|e| e.to_string())?,
                average_stock_level: ar.try_get("average_stock_level").unwrap_or(0.0),
            };
            Ok(ApiResponse { success: true, data: Some(analytics), message: None, error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_top_moving_items_report(
    request: ReportRequest,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<TopMovingItemsReport>>, String> {
    let limit = limit.unwrap_or(20);
    let mut query = "SELECT sm.inventory_item_id as item_id, ii.name as item_name,
               SUM(sm.quantity) as total_quantity_out,
               SUM(COALESCE(sm.total_cost, sm.quantity * ii.cost_price)) as total_value_out,
               COUNT(*) as movement_frequency,
               ROW_NUMBER() OVER (ORDER BY SUM(sm.quantity) DESC) as rank
        FROM stock_movements sm
        JOIN inventory_items ii ON sm.inventory_item_id = ii.id
        WHERE sm.restaurant_id = ? AND sm.movement_type = 'OUT'".to_string();
    let mut params = vec![request.restaurant_id];
    if let Some(ref d) = request.start_date { query.push_str(" AND DATE(sm.movement_date) >= ?"); params.push(parse_date_to_i64(d)); }
    if let Some(ref d) = request.end_date { query.push_str(" AND DATE(sm.movement_date) <= ?"); params.push(parse_date_to_i64(d)); }
    query.push_str(" GROUP BY sm.inventory_item_id, ii.name ORDER BY total_quantity_out DESC LIMIT ?");
    params.push(limit);
    let mut q = sqlx::query_as::<_, TopMovingItemsReport>(&query);
    for p in params { q = q.bind(p); }
    match q.fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse { success: true, data: Some(report), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_slow_moving_items_report(
    restaurant_id: i64,
    days_threshold: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<SlowMovingItemsReport>>, String> {
    let threshold = days_threshold.unwrap_or(30);
    let query = "SELECT ii.id as item_id, ii.name as item_name, ii.current_stock,
               julianday('now') - julianday(MAX(sm.movement_date)) as days_since_last_movement,
               (ii.current_stock * ii.cost_price) as total_value,
               MAX(DATE(sm.movement_date)) as last_movement_date
        FROM inventory_items ii
        LEFT JOIN stock_movements sm ON ii.id = sm.inventory_item_id AND sm.movement_type = 'OUT'
        WHERE ii.restaurant_id = ? AND ii.is_active = 1 AND ii.current_stock > 0
        GROUP BY ii.id, ii.name, ii.current_stock, ii.cost_price
        HAVING days_since_last_movement > ? OR days_since_last_movement IS NULL
        ORDER BY days_since_last_movement DESC";
    match sqlx::query_as::<_, SlowMovingItemsReport>(query).bind(restaurant_id).bind(threshold).fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse { success: true, data: Some(report), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
