use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::pricing::{PriceCalculation, PricingStrategy, calculate_price_by_strategy, calculate_metrics};
use tauri::State;
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct BulkPriceUpdateRequest {
    pub restaurant_id: i64,
    pub category_ids: Option<Vec<i64>>,
    pub menu_item_ids: Option<Vec<i64>>,
    pub strategy: PricingStrategy,
    pub markup_percentage: Option<f64>,
    pub fixed_markup: Option<f64>,
    pub target_margin: Option<f64>,
    pub apply_changes: bool,
}

#[derive(Debug, Serialize)]
pub struct BulkPriceUpdateResult {
    pub total_items: usize,
    pub updated_items: usize,
    pub calculations: Vec<PriceCalculation>,
    pub total_revenue_impact: f64,
}

#[tauri::command]
pub async fn bulk_calculate_prices(
    request: BulkPriceUpdateRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<BulkPriceUpdateResult>, String> {
    let mut query = "SELECT id, name, price, cost_price FROM menu_items WHERE restaurant_id = ?".to_string();
    let mut bindings = vec![request.restaurant_id];

    if let Some(ref cat_ids) = request.category_ids {
        let ph = cat_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        query.push_str(&format!(" AND category_id IN ({})", ph));
        for &id in cat_ids { bindings.push(id); }
    }
    if let Some(ref item_ids) = request.menu_item_ids {
        let ph = item_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        query.push_str(&format!(" AND id IN ({})", ph));
        for &id in item_ids { bindings.push(id); }
    }

    let mut q = sqlx::query(&query);
    for b in bindings { q = q.bind(b); }
    let items = q.fetch_all(&*db).await.map_err(|e| format!("Database error: {}", e))?;

    let mut calculations = Vec::new();
    let mut updated_items = 0usize;
    let mut total_revenue_impact = 0.0f64;

    for item in &items {
        let id: i64 = item.try_get("id").map_err(|e| e.to_string())?;
        let name: String = item.try_get("name").map_err(|e| e.to_string())?;
        let current_price: f64 = item.try_get("price").map_err(|e| e.to_string())?;
        let cost_price: f64 = item.get::<Option<f64>, _>("cost_price").unwrap_or(0.0);

        let suggested_price = calculate_price_by_strategy(cost_price, current_price, &request.strategy, request.markup_percentage, request.fixed_markup, request.target_margin);
        let (markup_amount, markup_percentage, profit_margin) = calculate_metrics(cost_price, suggested_price);

        total_revenue_impact += suggested_price - current_price;
        calculations.push(PriceCalculation { menu_item_id: id, item_name: name, cost_price, current_price, suggested_price, markup_amount, markup_percentage, profit_margin });

        if request.apply_changes && (suggested_price - current_price).abs() > 0.01 {
            if sqlx::query("UPDATE menu_items SET price = ? WHERE id = ?").bind(suggested_price).bind(id).execute(&*db).await.is_ok() {
                updated_items += 1;
            }
        }
    }

    let total_items = calculations.len();
    Ok(ApiResponse { success: true, data: Some(BulkPriceUpdateResult { total_items, updated_items, calculations, total_revenue_impact }),
        message: Some(if request.apply_changes { format!("Updated prices for {} items", updated_items) } else { format!("Calculated prices for {} items", total_items) }),
        error: None })
}

#[tauri::command]
pub async fn get_pricing_analytics(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let row = sqlx::query(
        "SELECT COUNT(*) as total_items, AVG(price) as avg_price, AVG(cost_price) as avg_cost,
         AVG(CASE WHEN cost_price > 0 THEN ((price - cost_price) / price) * 100 ELSE 0 END) as avg_margin,
         MIN(price) as min_price, MAX(price) as max_price
         FROM menu_items WHERE restaurant_id = ? AND is_active = 1"
    ).bind(restaurant_id).fetch_one(&*db).await.map_err(|e| format!("Database error: {}", e))?;

    Ok(ApiResponse { success: true, data: Some(serde_json::json!({
        "total_items": row.try_get::<i64, _>("total_items").unwrap_or(0),
        "average_price": row.try_get::<Option<f64>, _>("avg_price").unwrap_or(None).unwrap_or(0.0),
        "average_cost": row.try_get::<Option<f64>, _>("avg_cost").unwrap_or(None).unwrap_or(0.0),
        "average_margin": row.try_get::<Option<f64>, _>("avg_margin").unwrap_or(None).unwrap_or(0.0),
        "price_range": { "min": row.try_get::<Option<f64>, _>("min_price").unwrap_or(None).unwrap_or(0.0), "max": row.try_get::<Option<f64>, _>("max_price").unwrap_or(None).unwrap_or(0.0) }
    })), message: None, error: None })
}

#[tauri::command]
pub async fn sync_cost_prices_from_recipes(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let result = sqlx::query(
        "UPDATE menu_items SET cost_price = (
             SELECT COALESCE(SUM(mii.quantity_required * COALESCE(ii.cost_price, 0)), 0)
             FROM menu_item_ingredients mii JOIN inventory_items ii ON mii.inventory_item_id = ii.id
             WHERE mii.menu_item_id = menu_items.id
         ) WHERE restaurant_id = ? AND EXISTS (SELECT 1 FROM menu_item_ingredients WHERE menu_item_id = menu_items.id)"
    ).bind(restaurant_id).execute(&*db).await.map_err(|e| format!("Database error: {}", e))?;

    Ok(ApiResponse { success: true,
        data: Some(format!("Updated {} items", result.rows_affected())),
        message: Some(format!("Synchronized cost prices for {} menu items", result.rows_affected())),
        error: None })
}
