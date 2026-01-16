use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, NaiveDate};
use sqlx::Row;

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

#[derive(Deserialize)]
pub struct ReportRequest {
    pub restaurant_id: i64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub category_id: Option<i64>,
    pub supplier_id: Option<i64>,
}

#[tauri::command]
pub async fn get_stock_summary_report(
    request: ReportRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<StockSummaryReport>>, String> {
    let mut query = "
        SELECT ii.id as item_id, ii.name as item_name, ii.sku, ic.name as category_name,
               ii.current_stock, ii.minimum_stock, ii.maximum_stock, ii.reorder_point,
               CASE 
                   WHEN ii.current_stock <= 0 THEN 'OUT_OF_STOCK'
                   WHEN ii.current_stock <= ii.reorder_point THEN 'LOW_STOCK'
                   WHEN ii.current_stock > ii.maximum_stock THEN 'OVERSTOCKED'
                   ELSE 'NORMAL'
               END as stock_status,
               (ii.current_stock * ii.cost_price) as total_value
        FROM inventory_items ii
        LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.restaurant_id = ? AND ii.is_active = 1".to_string();

    let mut params = vec![request.restaurant_id];

    if let Some(category_id) = request.category_id {
        query.push_str(" AND ii.category_id = ?");
        params.push(category_id);
    }

    if let Some(supplier_id) = request.supplier_id {
        query.push_str(" AND ii.supplier_id = ?");
        params.push(supplier_id);
    }

    query.push_str(" ORDER BY ii.name");

    let mut query_builder = sqlx::query_as::<_, StockSummaryReport>(&query);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    match query_builder.fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse {
            success: true,
            data: Some(report),
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
pub async fn get_movement_report(
    request: ReportRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MovementReport>>, String> {
    let mut query = "
        SELECT sm.inventory_item_id as item_id, ii.name as item_name, sm.movement_type,
               SUM(ABS(sm.quantity)) as total_quantity,
               SUM(COALESCE(sm.total_cost, sm.quantity * ii.cost_price)) as total_value,
               COUNT(*) as movement_count
        FROM stock_movements sm
        JOIN inventory_items ii ON sm.inventory_item_id = ii.id
        WHERE sm.restaurant_id = ?".to_string();

    let mut params = vec![request.restaurant_id];

    if let Some(start_date) = &request.start_date {
        query.push_str(" AND DATE(sm.movement_date) >= ?");
        params.push(parse_param_as_i64(start_date));
    }

    if let Some(end_date) = &request.end_date {
        query.push_str(" AND DATE(sm.movement_date) <= ?");
        params.push(parse_param_as_i64(end_date));
    }

    if let Some(category_id) = request.category_id {
        query.push_str(" AND ii.category_id = ?");
        params.push(category_id);
    }

    query.push_str(" GROUP BY sm.inventory_item_id, ii.name, sm.movement_type ORDER BY ii.name, sm.movement_type");

    let mut query_builder = sqlx::query_as::<_, MovementReport>(&query);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    match query_builder.fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse {
            success: true,
            data: Some(report),
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
pub async fn get_low_stock_report(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<LowStockReport>>, String> {
    let query = "
        SELECT ii.id as item_id, ii.name as item_name, ii.sku,
               ii.current_stock, ii.reorder_point,
               (ii.reorder_point - ii.current_stock) as shortage,
               CASE 
                   WHEN avg_daily_usage.daily_usage > 0 
                   THEN ii.current_stock / avg_daily_usage.daily_usage
                   ELSE NULL
               END as days_of_stock,
               s.name as supplier_name
        FROM inventory_items ii
        LEFT JOIN suppliers s ON ii.supplier_id = s.id
        LEFT JOIN (
            SELECT inventory_item_id, 
                   AVG(ABS(quantity)) as daily_usage
            FROM stock_movements 
            WHERE movement_type = 'OUT' 
            AND movement_date >= date('now', '-30 days')
            GROUP BY inventory_item_id
        ) avg_daily_usage ON ii.id = avg_daily_usage.inventory_item_id
        WHERE ii.restaurant_id = ? AND ii.is_active = 1 
        AND ii.current_stock <= ii.reorder_point
        ORDER BY shortage DESC";

    match sqlx::query_as::<_, LowStockReport>(query)
        .bind(restaurant_id)
        .fetch_all(&*db)
        .await
    {
        Ok(report) => Ok(ApiResponse {
            success: true,
            data: Some(report),
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
pub async fn get_inventory_analytics(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<InventoryAnalytics>, String> {
    let analytics_query = "
        SELECT 
            COUNT(*) as total_items,
            SUM(current_stock * cost_price) as total_inventory_value,
            COUNT(CASE WHEN current_stock <= reorder_point AND current_stock > 0 THEN 1 END) as low_stock_items,
            COUNT(CASE WHEN current_stock <= 0 THEN 1 END) as out_of_stock_items,
            COUNT(CASE WHEN current_stock > maximum_stock THEN 1 END) as overstocked_items,
            AVG(current_stock) as average_stock_level
        FROM inventory_items 
        WHERE restaurant_id = ? AND is_active = 1";

    let categories_query = "
        SELECT COUNT(DISTINCT category_id) as total_categories
        FROM inventory_items 
        WHERE restaurant_id = ? AND is_active = 1 AND category_id IS NOT NULL";

    match tokio::try_join!(
        sqlx::query(analytics_query).bind(restaurant_id).fetch_one(&*db),
        sqlx::query(categories_query).bind(restaurant_id).fetch_one(&*db)
    ) {
        Ok((analytics_row, categories_row)) => {
            let analytics = InventoryAnalytics {
                total_items: analytics_row.try_get("total_items"),
                total_inventory_value: analytics_row.try_get("total_inventory_value").unwrap_or(0.0),
                low_stock_items: analytics_row.try_get("low_stock_items"),
                out_of_stock_items: analytics_row.try_get("out_of_stock_items"),
                overstocked_items: analytics_row.try_get("overstocked_items"),
                total_categories: categories_row.try_get("total_categories"),
                average_stock_level: analytics_row.try_get("average_stock_level").unwrap_or(0.0),
            };

            Ok(ApiResponse {
                success: true,
                data: Some(analytics),
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

#[derive(Serialize, sqlx::FromRow)]
pub struct TopMovingItemsReport {
    pub item_id: i64,
    pub item_name: String,
    pub total_quantity_out: f64,
    pub total_value_out: f64,
    pub movement_frequency: i64,
    pub rank: i64,
}

#[tauri::command]
pub async fn get_top_moving_items_report(
    request: ReportRequest,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<TopMovingItemsReport>>, String> {
    let limit = limit.unwrap_or(20);
    
    let mut query = "
        SELECT sm.inventory_item_id as item_id, ii.name as item_name,
               SUM(sm.quantity) as total_quantity_out,
               SUM(COALESCE(sm.total_cost, sm.quantity * ii.cost_price)) as total_value_out,
               COUNT(*) as movement_frequency,
               ROW_NUMBER() OVER (ORDER BY SUM(sm.quantity) DESC) as rank
        FROM stock_movements sm
        JOIN inventory_items ii ON sm.inventory_item_id = ii.id
        WHERE sm.restaurant_id = ? AND sm.movement_type = 'OUT'".to_string();

    let mut params = vec![request.restaurant_id];

    if let Some(start_date) = &request.start_date {
        query.push_str(" AND DATE(sm.movement_date) >= ?");
        params.push(parse_param_as_i64(start_date));
    }

    if let Some(end_date) = &request.end_date {
        query.push_str(" AND DATE(sm.movement_date) <= ?");
        params.push(parse_param_as_i64(end_date));
    }

    query.push_str(" GROUP BY sm.inventory_item_id, ii.name ORDER BY total_quantity_out DESC LIMIT ?");
    params.push(limit);

    let mut query_builder = sqlx::query_as::<_, TopMovingItemsReport>(&query);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    match query_builder.fetch_all(&*db).await {
        Ok(report) => Ok(ApiResponse {
            success: true,
            data: Some(report),
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
pub async fn get_slow_moving_items_report(
    restaurant_id: i64,
    days_threshold: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<SlowMovingItemsReport>>, String> {
    let days_threshold = days_threshold.unwrap_or(30);
    
    let query = "
        SELECT ii.id as item_id, ii.name as item_name, ii.current_stock,
               julianday('now') - julianday(MAX(sm.movement_date)) as days_since_last_movement,
               (ii.current_stock * ii.cost_price) as total_value,
               MAX(DATE(sm.movement_date)) as last_movement_date
        FROM inventory_items ii
        LEFT JOIN stock_movements sm ON ii.id = sm.inventory_item_id AND sm.movement_type = 'OUT'
        WHERE ii.restaurant_id = ? AND ii.is_active = 1 AND ii.current_stock > 0
        GROUP BY ii.id, ii.name, ii.current_stock, ii.cost_price
        HAVING days_since_last_movement > ? OR days_since_last_movement IS NULL
        ORDER BY days_since_last_movement DESC";

    match sqlx::query_as::<_, SlowMovingItemsReport>(query)
        .bind(restaurant_id)
        .bind(days_threshold)
        .fetch_all(&*db)
        .await
    {
        Ok(report) => Ok(ApiResponse {
            success: true,
            data: Some(report),
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

fn parse_param_as_i64(date_str: &str) -> i64 {
    match NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        Ok(date) => date.and_hms_opt(0, 0, 0).unwrap().timestamp(),
        Err(_) => 0, // fallback to epoch if parsing fails
    }
}