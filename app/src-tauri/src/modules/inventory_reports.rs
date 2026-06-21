use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::NaiveDate;

#[derive(Serialize, sqlx::FromRow)]
pub struct StockSummaryReport {
    pub item_id: i64,
    pub item_name: String,
    pub sku: Option<String>,
    pub category_name: Option<String>,
    pub current_stock: f64,
    pub minimum_stock: f64,
    pub maximum_stock: f64,
    pub reorder_point: f64,
    pub stock_status: String,
    pub total_value: f64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MovementReport {
    pub item_id: i64,
    pub item_name: String,
    pub movement_type: String,
    pub total_quantity: f64,
    pub total_value: f64,
    pub movement_count: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct LowStockReport {
    pub item_id: i64,
    pub item_name: String,
    pub sku: Option<String>,
    pub current_stock: f64,
    pub reorder_point: f64,
    pub shortage: f64,
    pub days_of_stock: Option<f64>,
    pub supplier_name: Option<String>,
}

#[derive(Deserialize)]
pub struct ReportRequest {
    pub restaurant_id: i64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub category_id: Option<i64>,
    pub supplier_id: Option<i64>,
}

pub fn parse_date_to_i64(date_str: &str) -> i64 {
    NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .ok()
        .and_then(|d| d.and_hms_opt(0, 0, 0))
        .map(|dt| dt.and_utc().timestamp())
        .unwrap_or(0)
}

#[tauri::command]
pub async fn get_stock_summary_report(
    request: ReportRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<StockSummaryReport>>, String> {
    let mut query = "SELECT ii.id as item_id, ii.name as item_name, ii.sku, ic.name as category_name,
               ii.current_stock, ii.minimum_stock, ii.maximum_stock, ii.reorder_point,
               CASE WHEN ii.current_stock <= 0 THEN 'OUT_OF_STOCK'
                    WHEN ii.current_stock <= ii.reorder_point THEN 'LOW_STOCK'
                    WHEN ii.current_stock > ii.maximum_stock THEN 'OVERSTOCKED'
                    ELSE 'NORMAL' END as stock_status,
               (ii.current_stock * ii.cost_price) as total_value
        FROM inventory_items ii
        LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.restaurant_id = ? AND ii.is_active = 1".to_string();
    let mut params = vec![request.restaurant_id];
    if let Some(cat) = request.category_id { query.push_str(" AND ii.category_id = ?"); params.push(cat); }
    if let Some(sup) = request.supplier_id { query.push_str(" AND ii.supplier_id = ?"); params.push(sup); }
    query.push_str(" ORDER BY ii.name");
    let mut q = sqlx::query_as::<_, StockSummaryReport>(&query);
    for p in params { q = q.bind(p); }
    match q.fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse { success: true, data: Some(report), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_movement_report(
    request: ReportRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MovementReport>>, String> {
    let mut query = "SELECT sm.inventory_item_id as item_id, ii.name as item_name, sm.movement_type,
               SUM(ABS(sm.quantity)) as total_quantity,
               SUM(COALESCE(sm.total_cost, sm.quantity * ii.cost_price)) as total_value,
               COUNT(*) as movement_count
        FROM stock_movements sm
        JOIN inventory_items ii ON sm.inventory_item_id = ii.id
        WHERE sm.restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id];
    if let Some(ref d) = request.start_date { query.push_str(" AND DATE(sm.movement_date) >= ?"); params.push(parse_date_to_i64(d)); }
    if let Some(ref d) = request.end_date { query.push_str(" AND DATE(sm.movement_date) <= ?"); params.push(parse_date_to_i64(d)); }
    if let Some(cat) = request.category_id { query.push_str(" AND ii.category_id = ?"); params.push(cat); }
    query.push_str(" GROUP BY sm.inventory_item_id, ii.name, sm.movement_type ORDER BY ii.name, sm.movement_type");
    let mut q = sqlx::query_as::<_, MovementReport>(&query);
    for p in params { q = q.bind(p); }
    match q.fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse { success: true, data: Some(report), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_low_stock_report(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<LowStockReport>>, String> {
    let query = "SELECT ii.id as item_id, ii.name as item_name, ii.sku,
               ii.current_stock, ii.reorder_point,
               (ii.reorder_point - ii.current_stock) as shortage,
               CASE WHEN avg_daily_usage.daily_usage > 0 THEN ii.current_stock / avg_daily_usage.daily_usage ELSE NULL END as days_of_stock,
               s.name as supplier_name
        FROM inventory_items ii
        LEFT JOIN suppliers s ON ii.supplier_id = s.id
        LEFT JOIN (
            SELECT inventory_item_id, AVG(ABS(quantity)) as daily_usage
            FROM stock_movements WHERE movement_type = 'OUT' AND movement_date >= date('now', '-30 days')
            GROUP BY inventory_item_id
        ) avg_daily_usage ON ii.id = avg_daily_usage.inventory_item_id
        WHERE ii.restaurant_id = ? AND ii.is_active = 1 AND ii.current_stock <= ii.reorder_point
        ORDER BY shortage DESC";
    match sqlx::query_as::<_, LowStockReport>(query).bind(restaurant_id).fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse { success: true, data: Some(report), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
