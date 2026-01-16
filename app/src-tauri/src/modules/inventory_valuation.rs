use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sqlx::Row;

#[derive(Debug, Clone)]
pub enum ValuationMethod {
    Fifo,
    Lifo,
    WeightedAverage,
    StandardCost,
}

impl ValuationMethod {
    pub fn from_str(method: &str) -> Option<ValuationMethod> {
        match method.to_uppercase().as_str() {
            "FIFO" => Some(ValuationMethod::Fifo),
            "LIFO" => Some(ValuationMethod::Lifo),
            "WEIGHTED_AVERAGE" => Some(ValuationMethod::WeightedAverage),
            "STANDARD_COST" => Some(ValuationMethod::StandardCost),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            ValuationMethod::Fifo => "FIFO",
            ValuationMethod::Lifo => "LIFO",
            ValuationMethod::WeightedAverage => "WEIGHTED_AVERAGE",
            ValuationMethod::StandardCost => "STANDARD_COST",
        }
    }
}

#[derive(Serialize)]
pub struct InventoryValuation {
    pub item_id: i64,
    pub item_name: String,
    pub current_stock: f64,
    pub total_value: f64,
    pub average_unit_cost: f64,
    pub valuation_method: String,
    pub last_updated: String,
}

#[derive(Serialize)]
pub struct ValuationSummary {
    pub total_inventory_value: f64,
    pub total_items: i64,
    pub valuation_method: String,
    pub items: Vec<InventoryValuation>,
}

#[derive(Deserialize)]
pub struct ValuationRequest {
    pub restaurant_id: i64,
    pub method: String,
    pub category_id: Option<i64>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct StockMovementForValuation {
    pub inventory_item_id: i64,
    pub movement_type: String,
    pub quantity: f64,
    pub unit_cost: Option<f64>,
    pub movement_date: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct InventoryItemForValuation {
    pub id: i64,
    pub name: String,
    pub current_stock: f64,
    pub cost_price: f64,
}

#[tauri::command]
pub async fn calculate_inventory_valuation(
    request: ValuationRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ValuationSummary>, String> {
    let valuation_method = match ValuationMethod::from_str(&request.method) {
        Some(method) => method,
        None => {
            return Ok(ApiResponse {
                success: false,
                data: None,
                message: None,
                error: Some("Invalid valuation method".to_string()),
            });
        }
    };

    let mut query = "SELECT id, name, current_stock, cost_price 
                     FROM inventory_items 
                     WHERE restaurant_id = ? AND is_active = 1 AND current_stock > 0".to_string();
    
    let mut params = vec![request.restaurant_id];

    if let Some(category_id) = request.category_id {
        query.push_str(" AND category_id = ?");
        params.push(category_id);
    }

    query.push_str(" ORDER BY name");

    match fetch_inventory_items(&query, &params, &db).await {
        Ok(items) => {
            let mut valuations = Vec::new();
            let mut total_value = 0.0;

            for item in items {
                let valuation = match valuation_method {
                    ValuationMethod::Fifo => calculate_fifo_valuation(&item, &db).await?,
                    ValuationMethod::Lifo => calculate_lifo_valuation(&item, &db).await?,
                    ValuationMethod::WeightedAverage => calculate_weighted_average_valuation(&item, &db).await?,
                    ValuationMethod::StandardCost => calculate_standard_cost_valuation(&item),
                };

                total_value += valuation.total_value;
                valuations.push(valuation);
            }

            let summary = ValuationSummary {
                total_inventory_value: total_value,
                total_items: valuations.len() as i64,
                valuation_method: valuation_method.as_str().to_string(),
                items: valuations,
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
            error: Some(e),
        })
    }
}

async fn fetch_inventory_items(
    query: &str,
    params: &[i64],
    db: &DbPool,
) -> Result<Vec<InventoryItemForValuation>, String> {
    let mut query_builder = sqlx::query_as::<_, InventoryItemForValuation>(query);
    
    for param in params {
        query_builder = query_builder.bind(param);
    }

    query_builder
        .fetch_all(db)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

async fn calculate_fifo_valuation(
    item: &InventoryItemForValuation,
    db: &DbPool,
) -> Result<InventoryValuation, String> {
    let movements = sqlx::query_as::<_, StockMovementForValuation>(
        "SELECT inventory_item_id, movement_type, quantity, unit_cost, movement_date
         FROM stock_movements 
         WHERE inventory_item_id = ? AND movement_type IN ('IN', 'RETURN') 
         AND unit_cost IS NOT NULL
         ORDER BY movement_date ASC"
    )
    .bind(item.id)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut remaining_stock = item.current_stock;
    let mut total_value = 0.0;
    
    for movement in movements {
        if remaining_stock <= 0.0 {
            break;
        }

        let cost = movement.unit_cost.unwrap_or(item.cost_price);
        let quantity_to_use = remaining_stock.min(movement.quantity);
        
        total_value += quantity_to_use * cost;
        remaining_stock -= quantity_to_use;
    }

    if remaining_stock > 0.0 {
        total_value += remaining_stock * item.cost_price;
    }

    let average_cost = if item.current_stock > 0.0 {
        total_value / item.current_stock
    } else {
        0.0
    };

    Ok(InventoryValuation {
        item_id: item.id,
        item_name: item.name.clone(),
        current_stock: item.current_stock,
        total_value,
        average_unit_cost: average_cost,
        valuation_method: "FIFO".to_string(),
        last_updated: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

async fn calculate_lifo_valuation(
    item: &InventoryItemForValuation,
    db: &DbPool,
) -> Result<InventoryValuation, String> {
    let movements = sqlx::query_as::<_, StockMovementForValuation>(
        "SELECT inventory_item_id, movement_type, quantity, unit_cost, movement_date
         FROM stock_movements 
         WHERE inventory_item_id = ? AND movement_type IN ('IN', 'RETURN') 
         AND unit_cost IS NOT NULL
         ORDER BY movement_date DESC"
    )
    .bind(item.id)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut remaining_stock = item.current_stock;
    let mut total_value = 0.0;
    
    for movement in movements {
        if remaining_stock <= 0.0 {
            break;
        }

        let cost = movement.unit_cost.unwrap_or(item.cost_price);
        let quantity_to_use = remaining_stock.min(movement.quantity);
        
        total_value += quantity_to_use * cost;
        remaining_stock -= quantity_to_use;
    }

    if remaining_stock > 0.0 {
        total_value += remaining_stock * item.cost_price;
    }

    let average_cost = if item.current_stock > 0.0 {
        total_value / item.current_stock
    } else {
        0.0
    };

    Ok(InventoryValuation {
        item_id: item.id,
        item_name: item.name.clone(),
        current_stock: item.current_stock,
        total_value,
        average_unit_cost: average_cost,
        valuation_method: "LIFO".to_string(),
        last_updated: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

async fn calculate_weighted_average_valuation(
    item: &InventoryItemForValuation,
    db: &DbPool,
) -> Result<InventoryValuation, String> {
    let movements = sqlx::query_as::<_, StockMovementForValuation>(
        "SELECT inventory_item_id, movement_type, quantity, unit_cost, movement_date
         FROM stock_movements 
         WHERE inventory_item_id = ? AND movement_type IN ('IN', 'RETURN') 
         AND unit_cost IS NOT NULL
         ORDER BY movement_date ASC"
    )
    .bind(item.id)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut total_cost = 0.0;
    let mut total_quantity = 0.0;

    for movement in movements {
        let cost = movement.unit_cost.unwrap_or(item.cost_price);
        total_cost += movement.quantity * cost;
        total_quantity += movement.quantity;
    }

    let weighted_average_cost = if total_quantity > 0.0 {
        total_cost / total_quantity
    } else {
        item.cost_price
    };

    let total_value = item.current_stock * weighted_average_cost;

    Ok(InventoryValuation {
        item_id: item.id,
        item_name: item.name.clone(),
        current_stock: item.current_stock,
        total_value,
        average_unit_cost: weighted_average_cost,
        valuation_method: "WEIGHTED_AVERAGE".to_string(),
        last_updated: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

fn calculate_standard_cost_valuation(item: &InventoryItemForValuation) -> InventoryValuation {
    let total_value = item.current_stock * item.cost_price;

    InventoryValuation {
        item_id: item.id,
        item_name: item.name.clone(),
        current_stock: item.current_stock,
        total_value,
        average_unit_cost: item.cost_price,
        valuation_method: "STANDARD_COST".to_string(),
        last_updated: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    }
}

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

#[tauri::command]
pub async fn compare_valuation_methods(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<ValuationComparison>>, String> {
    let items_query = "SELECT id, name, current_stock, cost_price 
                      FROM inventory_items 
                      WHERE restaurant_id = ? AND is_active = 1 AND current_stock > 0
                      ORDER BY name";

    match fetch_inventory_items(items_query, &[restaurant_id], &db).await {
        Ok(items) => {
            let mut comparisons = Vec::new();

            for item in items {
                let fifo_val = calculate_fifo_valuation(&item, &db).await.unwrap_or_else(|_| {
                    calculate_standard_cost_valuation(&item)
                });

                let lifo_val = calculate_lifo_valuation(&item, &db).await.unwrap_or_else(|_| {
                    calculate_standard_cost_valuation(&item)
                });

                let weighted_avg_val = calculate_weighted_average_valuation(&item, &db).await.unwrap_or_else(|_| {
                    calculate_standard_cost_valuation(&item)
                });

                let standard_cost_val = calculate_standard_cost_valuation(&item);

                let comparison = ValuationComparison {
                    item_id: item.id,
                    item_name: item.name.clone(),
                    current_stock: item.current_stock,
                    fifo_value: fifo_val.total_value,
                    lifo_value: lifo_val.total_value,
                    weighted_average_value: weighted_avg_val.total_value,
                    standard_cost_value: standard_cost_val.total_value,
                };

                comparisons.push(comparison);
            }

            Ok(ApiResponse {
                success: true,
                data: Some(comparisons),
                message: None,
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(e),
        })
    }
}