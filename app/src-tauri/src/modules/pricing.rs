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

#[derive(Debug, Deserialize)]
pub struct UpdateMenuItemPriceRequest {
    pub menu_item_id: i64,
    pub restaurant_id: i64,
    pub new_price: f64,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BulkPriceUpdateResult {
    pub total_items: usize,
    pub updated_items: usize,
    pub calculations: Vec<PriceCalculation>,
    pub total_revenue_impact: f64,
}

fn calculate_price_by_strategy(
    cost_price: f64,
    current_price: f64,
    strategy: &PricingStrategy,
    markup_percentage: Option<f64>,
    fixed_markup: Option<f64>,
    target_margin: Option<f64>,
) -> f64 {
    match strategy {
        PricingStrategy::PercentageMarkup => {
            let markup = markup_percentage.unwrap_or(50.0) / 100.0;
            cost_price * (1.0 + markup)
        },
        PricingStrategy::FixedMarkup => {
            cost_price + fixed_markup.unwrap_or(5.0)
        },
        PricingStrategy::CompetitivePricing => {
            let base_price = cost_price * 1.3;
            base_price.max(cost_price * 1.15)
        },
        PricingStrategy::ValueBased => {
            let margin = target_margin.unwrap_or(40.0) / 100.0;
            cost_price / (1.0 - margin)
        },
    }
}

fn calculate_metrics(cost_price: f64, selling_price: f64) -> (f64, f64, f64) {
    let markup_amount = selling_price - cost_price;
    let markup_percentage = if cost_price > 0.0 {
        (markup_amount / cost_price) * 100.0
    } else { 0.0 };
    let profit_margin = if selling_price > 0.0 {
        (markup_amount / selling_price) * 100.0
    } else { 0.0 };
    
    (markup_amount, markup_percentage, profit_margin)
}

#[tauri::command]
pub async fn calculate_menu_item_price(
    request: CalculatePriceRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<PriceCalculation>, String> {
    let item = sqlx::query!(
        "SELECT name, price, cost_price FROM menu_items WHERE id = ?",
        request.menu_item_id
    )
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let item = item.ok_or("Menu item not found")?;
    let cost_price = item.cost_price.unwrap_or(0.0);
    let current_price = item.price;

    let suggested_price = calculate_price_by_strategy(
        cost_price,
        current_price,
        &request.strategy,
        request.markup_percentage,
        request.fixed_markup,
        request.target_margin,
    );

    let (markup_amount, markup_percentage, profit_margin) = 
        calculate_metrics(cost_price, suggested_price);

    let calculation = PriceCalculation {
        menu_item_id: request.menu_item_id,
        item_name: item.name,
        cost_price,
        current_price,
        suggested_price,
        markup_amount,
        markup_percentage,
        profit_margin,
    };

    Ok(ApiResponse {
        success: true,
        data: Some(calculation),
        message: None,
        error: None,
    })
}

#[tauri::command]
pub async fn bulk_calculate_prices(
    request: BulkPriceUpdateRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<BulkPriceUpdateResult>, String> {
    let mut query = "SELECT id, name, price, cost_price FROM menu_items WHERE restaurant_id = ?".to_string();
    let mut bindings = vec![request.restaurant_id];

    if let Some(ref category_ids) = request.category_ids {
        let placeholders = category_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        query.push_str(&format!(" AND category_id IN ({})", placeholders));
        for &id in category_ids {
            bindings.push(id);
        }
    }

    if let Some(ref item_ids) = request.menu_item_ids {
        let placeholders = item_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        query.push_str(&format!(" AND id IN ({})", placeholders));
        for &id in item_ids {
            bindings.push(id);
        }
    }

    let mut query_builder = sqlx::query(&query);
    for binding in bindings {
        query_builder = query_builder.bind(binding);
    }

    let items = query_builder
        .fetch_all(&*db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let mut calculations = Vec::new();
    let mut updated_items = 0;
    let mut total_revenue_impact = 0.0;

    for item in items.iter() {
        let id: i64 = item.try_get("id");
        let name: String = item.try_get("name");
        let current_price: f64 = item.try_get("price");
        let cost_price: f64 = item.get::<Option<f64>, _>("cost_price").unwrap_or(0.0);

        let suggested_price = calculate_price_by_strategy(
            cost_price,
            current_price,
            &request.strategy,
            request.markup_percentage,
            request.fixed_markup,
            request.target_margin,
        );

        let (markup_amount, markup_percentage, profit_margin) = 
            calculate_metrics(cost_price, suggested_price);

        let calculation = PriceCalculation {
            menu_item_id: id,
            item_name: name,
            cost_price,
            current_price,
            suggested_price,
            markup_amount,
            markup_percentage,
            profit_margin,
        };

        total_revenue_impact += suggested_price - current_price;
        calculations.push(calculation);

        if request.apply_changes && (suggested_price - current_price).abs() > 0.01 {
            match sqlx::query("UPDATE menu_items SET price = ? WHERE id = ?")
                .bind(suggested_price)
                .bind(id)
                .execute(&*db)
                .await
            {
                Ok(_) => updated_items += 1,
                Err(_) => continue,
            }
        }
    }

    let result = BulkPriceUpdateResult {
        total_items: calculations.len(),
        updated_items,
        calculations,
        total_revenue_impact,
    };

    Ok(ApiResponse {
        success: true,
        data: Some(result),
        message: if request.apply_changes {
            Some(format!("Updated prices for {} items", updated_items))
        } else {
            Some(format!("Calculated prices for {} items", result.total_items))
        },
        error: None,
    })
}

#[tauri::command]
pub async fn update_menu_item_price(
    request: UpdateMenuItemPriceRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    if request.new_price < 0.0 {
        return Err("Price cannot be negative".to_string());
    }

    let result = sqlx::query!(
        "UPDATE menu_items SET price = ? WHERE id = ? AND restaurant_id = ?",
        request.new_price,
        request.menu_item_id,
        request.restaurant_id
    )
    .execute(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("Menu item not found or access denied".to_string());
    }

    sqlx::query!(
        "INSERT INTO price_history (menu_item_id, old_price, new_price, reason, changed_at) 
         SELECT ?, price, ?, ?, ? FROM menu_items WHERE id = ?",
        request.menu_item_id,
        request.new_price,
        request.reason,
        Utc::now().naive_utc(),
        request.menu_item_id
    )
    .execute(&*db)
    .await
    .map_err(|e| format!("Failed to log price change: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some("Price updated successfully".to_string()),
        message: Some(format!("Menu item price updated to ${:.2}", request.new_price)),
        error: None,
    })
}

#[tauri::command]
pub async fn get_pricing_analytics(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let stats = sqlx::query!(
        "SELECT 
            COUNT(*) as total_items,
            AVG(price) as avg_price,
            AVG(cost_price) as avg_cost,
            AVG(CASE WHEN cost_price > 0 THEN ((price - cost_price) / price) * 100 ELSE 0 END) as avg_margin,
            MIN(price) as min_price,
            MAX(price) as max_price
         FROM menu_items 
         WHERE restaurant_id = ? AND is_active = 1",
        restaurant_id
    )
    .fetch_one(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let analytics = serde_json::json!({
        "total_items": stats.total_items,
        "average_price": stats.avg_price.unwrap_or(0.0),
        "average_cost": stats.avg_cost.unwrap_or(0.0),
        "average_margin": stats.avg_margin.unwrap_or(0.0),
        "price_range": {
            "min": stats.min_price.unwrap_or(0.0),
            "max": stats.max_price.unwrap_or(0.0)
        }
    });

    Ok(ApiResponse {
        success: true,
        data: Some(analytics),
        message: None,
        error: None,
    })
}

#[tauri::command]
pub async fn sync_cost_prices_from_recipes(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let updated = sqlx::query!(
        "UPDATE menu_items 
         SET cost_price = (
             SELECT COALESCE(SUM(mii.quantity_required * COALESCE(ii.cost_price, 0)), 0)
             FROM menu_item_ingredients mii
             JOIN inventory_items ii ON mii.inventory_item_id = ii.id
             WHERE mii.menu_item_id = menu_items.id
         )
         WHERE restaurant_id = ? AND EXISTS (
             SELECT 1 FROM menu_item_ingredients WHERE menu_item_id = menu_items.id
         )",
        restaurant_id
    )
    .execute(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some(format!("Updated {} items", updated.rows_affected())),
        message: Some(format!("Synchronized cost prices for {} menu items", updated.rows_affected())),
        error: None,
    })
}