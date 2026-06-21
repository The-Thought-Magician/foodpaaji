use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::Serialize;
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ItemForecast {
    pub item_id: i64,
    pub item_name: String,
    pub unit: String,
    pub current_stock: f64,
    pub avg_daily_consumption: f64,
    pub days_remaining: f64,
    pub reorder_quantity: f64,
    pub reorder_point: f64,
    pub stockout_risk: String,
    pub suggested_order_date: String,
}

#[tauri::command]
pub async fn get_inventory_forecast(
    days: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<ItemForecast>>, String> {
    let lookback = days.unwrap_or(30);

    // avg daily OUT consumption per item over lookback period
    let rows = sqlx::query(
        "SELECT i.id, i.name, i.base_unit as unit,
           COALESCE(i.current_stock, 0) as current_stock,
           COALESCE(i.minimum_stock, 0) as minimum_stock,
           COALESCE(SUM(CASE WHEN sm.movement_type IN ('OUT','WASTE') THEN ABS(sm.quantity) ELSE 0 END), 0) as total_out,
           COUNT(DISTINCT date(sm.movement_date)) as active_days
         FROM inventory_items i
         LEFT JOIN stock_movements sm ON sm.inventory_item_id = i.id
           AND sm.movement_date >= datetime('now', ? || ' days')
           AND sm.movement_type IN ('OUT','WASTE')
         WHERE i.is_active = 1
         GROUP BY i.id, i.name, i.base_unit, i.current_stock, i.minimum_stock
         HAVING total_out > 0
         ORDER BY days_remaining ASC"
    )
    .bind(format!("-{}", lookback))
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    let forecasts: Vec<ItemForecast> = rows.iter().map(|r| {
        let total_out: f64 = r.get("total_out");
        let active_days: i64 = r.get("active_days");
        let current_stock: f64 = r.get("current_stock");
        let minimum_stock: f64 = r.get("minimum_stock");

        let avg_daily = if active_days > 0 { total_out / active_days as f64 } else { 0.0 };
        let days_remaining = if avg_daily > 0.0 { current_stock / avg_daily } else { 999.0 };

        // reorder point = 3-day buffer above minimum stock
        let reorder_point = minimum_stock + (avg_daily * 3.0);
        // suggested order qty = 7-day supply
        let reorder_qty = (avg_daily * 7.0).ceil();

        let risk = if days_remaining <= 3.0 { "critical" }
            else if days_remaining <= 7.0 { "high" }
            else if days_remaining <= 14.0 { "medium" }
            else { "low" };

        // rough stockout date
        let order_days = if days_remaining <= 7.0 { 0 } else { (days_remaining - 7.0) as i64 };
        let suggested_date = if order_days == 0 {
            "Order now".to_string()
        } else {
            format!("In {} days", order_days)
        };

        ItemForecast {
            item_id: r.get("id"),
            item_name: r.get("name"),
            unit: r.get("unit"),
            current_stock: (current_stock * 100.0).round() / 100.0,
            avg_daily_consumption: (avg_daily * 100.0).round() / 100.0,
            days_remaining: (days_remaining * 10.0).round() / 10.0,
            reorder_quantity: reorder_qty,
            reorder_point: (reorder_point * 100.0).round() / 100.0,
            stockout_risk: risk.to_string(),
            suggested_order_date: suggested_date,
        }
    }).collect();

    Ok(ApiResponse {
        success: true,
        data: Some(forecasts),
        message: None,
        error: None,
    })
}
