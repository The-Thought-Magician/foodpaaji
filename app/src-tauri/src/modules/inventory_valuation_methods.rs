use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::inventory_valuation::{
    InventoryValuation, InventoryItemForValuation, StockMovementForValuation, fetch_inventory_items,
};
use tauri::State;
use serde::Serialize;

#[derive(Serialize)]
pub struct ValuationComparison {
    pub item_id: i64,
    pub item_name: String,
    pub current_stock: f64,
    pub fifo_value: f64,
    pub lifo_value: f64,
    pub weighted_average_value: f64,
    pub standard_cost_value: f64,
}

async fn fetch_in_movements(item_id: i64, db: &DbPool, order: &str) -> Result<Vec<StockMovementForValuation>, String> {
    let q = format!(
        "SELECT inventory_item_id, movement_type, quantity, unit_cost, movement_date \
         FROM stock_movements WHERE inventory_item_id = ? AND movement_type IN ('IN', 'RETURN') \
         AND unit_cost IS NOT NULL ORDER BY movement_date {}", order
    );
    sqlx::query_as::<_, StockMovementForValuation>(&q)
        .bind(item_id).fetch_all(db).await.map_err(|e| format!("Database error: {}", e))
}

fn now_str() -> String { chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string() }

pub async fn calculate_fifo_valuation(item: &InventoryItemForValuation, db: &DbPool) -> Result<InventoryValuation, String> {
    let movements = fetch_in_movements(item.id, db, "ASC").await?;
    let (total_value, _) = apply_stack(item.current_stock, item.cost_price, &movements);
    Ok(InventoryValuation {
        item_id: item.id, item_name: item.name.clone(), current_stock: item.current_stock,
        total_value, average_unit_cost: if item.current_stock > 0.0 { total_value / item.current_stock } else { 0.0 },
        valuation_method: "FIFO".to_string(), last_updated: now_str(),
    })
}

pub async fn calculate_lifo_valuation(item: &InventoryItemForValuation, db: &DbPool) -> Result<InventoryValuation, String> {
    let movements = fetch_in_movements(item.id, db, "DESC").await?;
    let (total_value, _) = apply_stack(item.current_stock, item.cost_price, &movements);
    Ok(InventoryValuation {
        item_id: item.id, item_name: item.name.clone(), current_stock: item.current_stock,
        total_value, average_unit_cost: if item.current_stock > 0.0 { total_value / item.current_stock } else { 0.0 },
        valuation_method: "LIFO".to_string(), last_updated: now_str(),
    })
}

fn apply_stack(mut remaining: f64, fallback_cost: f64, movements: &[StockMovementForValuation]) -> (f64, f64) {
    let mut total = 0.0;
    for m in movements {
        if remaining <= 0.0 { break; }
        let cost = m.unit_cost.unwrap_or(fallback_cost);
        let qty = remaining.min(m.quantity);
        total += qty * cost;
        remaining -= qty;
    }
    if remaining > 0.0 { total += remaining * fallback_cost; }
    (total, remaining)
}

pub async fn calculate_weighted_average_valuation(item: &InventoryItemForValuation, db: &DbPool) -> Result<InventoryValuation, String> {
    let movements = fetch_in_movements(item.id, db, "ASC").await?;
    let (mut total_cost, mut total_qty) = (0.0f64, 0.0f64);
    for m in &movements { let c = m.unit_cost.unwrap_or(item.cost_price); total_cost += m.quantity * c; total_qty += m.quantity; }
    let avg_cost = if total_qty > 0.0 { total_cost / total_qty } else { item.cost_price };
    let total_value = item.current_stock * avg_cost;
    Ok(InventoryValuation {
        item_id: item.id, item_name: item.name.clone(), current_stock: item.current_stock,
        total_value, average_unit_cost: avg_cost,
        valuation_method: "WEIGHTED_AVERAGE".to_string(), last_updated: now_str(),
    })
}

pub fn calculate_standard_cost_valuation(item: &InventoryItemForValuation) -> InventoryValuation {
    InventoryValuation {
        item_id: item.id, item_name: item.name.clone(), current_stock: item.current_stock,
        total_value: item.current_stock * item.cost_price, average_unit_cost: item.cost_price,
        valuation_method: "STANDARD_COST".to_string(), last_updated: now_str(),
    }
}

#[tauri::command]
pub async fn compare_valuation_methods(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<ValuationComparison>>, String> {
    let query = "SELECT id, name, current_stock, cost_price FROM inventory_items \
                 WHERE restaurant_id = ? AND is_active = 1 AND current_stock > 0 ORDER BY name";
    match fetch_inventory_items(query, &[restaurant_id], &db).await {
        Ok(items) => {
            let mut comparisons = Vec::new();
            for item in items {
                let std = calculate_standard_cost_valuation(&item);
                let fifo = calculate_fifo_valuation(&item, &db).await.unwrap_or_else(|_| calculate_standard_cost_valuation(&item));
                let lifo = calculate_lifo_valuation(&item, &db).await.unwrap_or_else(|_| calculate_standard_cost_valuation(&item));
                let wavg = calculate_weighted_average_valuation(&item, &db).await.unwrap_or_else(|_| calculate_standard_cost_valuation(&item));
                comparisons.push(ValuationComparison {
                    item_id: item.id, item_name: item.name.clone(), current_stock: item.current_stock,
                    fifo_value: fifo.total_value, lifo_value: lifo.total_value,
                    weighted_average_value: wavg.total_value, standard_cost_value: std.total_value,
                });
            }
            Ok(ApiResponse { success: true, data: Some(comparisons), message: None, error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
    }
}
