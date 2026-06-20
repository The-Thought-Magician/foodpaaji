use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use sqlx::Row;

#[derive(Debug, Serialize, Deserialize)]
pub enum PricingStrategy {
    PercentageMarkup,
    FixedMarkup,
    CompetitivePricing,
    ValueBased,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PriceCalculation {
    pub menu_item_id: i64,
    pub item_name: String,
    pub cost_price: f64,
    pub current_price: f64,
    pub suggested_price: f64,
    pub markup_amount: f64,
    pub markup_percentage: f64,
    pub profit_margin: f64,
}

#[derive(Debug, Deserialize)]
pub struct CalculatePriceRequest {
    pub menu_item_id: i64,
    pub strategy: PricingStrategy,
    pub markup_percentage: Option<f64>,
    pub fixed_markup: Option<f64>,
    pub target_margin: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMenuItemPriceRequest {
    pub menu_item_id: i64,
    pub restaurant_id: i64,
    pub new_price: f64,
    pub reason: Option<String>,
}

pub fn calculate_price_by_strategy(
    cost_price: f64,
    current_price: f64,
    strategy: &PricingStrategy,
    markup_percentage: Option<f64>,
    fixed_markup: Option<f64>,
    target_margin: Option<f64>,
) -> f64 {
    match strategy {
        PricingStrategy::PercentageMarkup => cost_price * (1.0 + markup_percentage.unwrap_or(50.0) / 100.0),
        PricingStrategy::FixedMarkup => cost_price + fixed_markup.unwrap_or(5.0),
        PricingStrategy::CompetitivePricing => (cost_price * 1.3f64).max(cost_price * 1.15),
        PricingStrategy::ValueBased => cost_price / (1.0 - target_margin.unwrap_or(40.0) / 100.0),
    }
}

pub fn calculate_metrics(cost_price: f64, selling_price: f64) -> (f64, f64, f64) {
    let markup_amount = selling_price - cost_price;
    let markup_percentage = if cost_price > 0.0 { (markup_amount / cost_price) * 100.0 } else { 0.0 };
    let profit_margin = if selling_price > 0.0 { (markup_amount / selling_price) * 100.0 } else { 0.0 };
    (markup_amount, markup_percentage, profit_margin)
}

#[tauri::command]
pub async fn calculate_menu_item_price(
    request: CalculatePriceRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<PriceCalculation>, String> {
    let item = sqlx::query("SELECT name, price, cost_price FROM menu_items WHERE id = ?")
        .bind(request.menu_item_id).fetch_optional(&*db).await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or("Menu item not found")?;

    let cost_price = item.try_get::<Option<f64>, _>("cost_price").map_err(|e| e.to_string())?.unwrap_or(0.0);
    let current_price = item.try_get::<f64, _>("price").map_err(|e| e.to_string())?;
    let item_name = item.try_get::<String, _>("name").map_err(|e| e.to_string())?;
    let suggested_price = calculate_price_by_strategy(cost_price, current_price, &request.strategy, request.markup_percentage, request.fixed_markup, request.target_margin);
    let (markup_amount, markup_percentage, profit_margin) = calculate_metrics(cost_price, suggested_price);

    Ok(ApiResponse { success: true, data: Some(PriceCalculation {
        menu_item_id: request.menu_item_id, item_name, cost_price, current_price,
        suggested_price, markup_amount, markup_percentage, profit_margin,
    }), message: None, error: None })
}

#[tauri::command]
pub async fn update_menu_item_price(
    request: UpdateMenuItemPriceRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    if request.new_price < 0.0 { return Err("Price cannot be negative".to_string()); }

    let result = sqlx::query("UPDATE menu_items SET price = ? WHERE id = ? AND restaurant_id = ?")
        .bind(request.new_price).bind(request.menu_item_id).bind(request.restaurant_id)
        .execute(&*db).await.map_err(|e| format!("Database error: {}", e))?;
    if result.rows_affected() == 0 { return Err("Menu item not found or access denied".to_string()); }

    sqlx::query("INSERT INTO price_history (menu_item_id, old_price, new_price, reason, changed_at) SELECT ?, price, ?, ?, ? FROM menu_items WHERE id = ?")
        .bind(request.menu_item_id).bind(request.new_price).bind(&request.reason)
        .bind(Utc::now().naive_utc()).bind(request.menu_item_id)
        .execute(&*db).await.map_err(|e| format!("Failed to log price change: {}", e))?;

    Ok(ApiResponse { success: true, data: Some("Price updated successfully".to_string()),
        message: Some(format!("Menu item price updated to ${:.2}", request.new_price)), error: None })
}
