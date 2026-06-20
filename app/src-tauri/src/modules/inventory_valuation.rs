use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::inventory_valuation_methods::{
    calculate_fifo_valuation, calculate_lifo_valuation,
    calculate_weighted_average_valuation, calculate_standard_cost_valuation,
};
use tauri::State;
use serde::{Deserialize, Serialize};

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

pub async fn fetch_inventory_items(query: &str, params: &[i64], db: &DbPool) -> Result<Vec<InventoryItemForValuation>, String> {
    let mut q = sqlx::query_as::<_, InventoryItemForValuation>(query);
    for param in params { q = q.bind(param); }
    q.fetch_all(db).await.map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub async fn calculate_inventory_valuation(
    request: ValuationRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ValuationSummary>, String> {
    let method = match ValuationMethod::from_str(&request.method) {
        Some(m) => m,
        None => return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Invalid valuation method".to_string()) }),
    };

    let mut query = "SELECT id, name, current_stock, cost_price FROM inventory_items \
                     WHERE restaurant_id = ? AND is_active = 1 AND current_stock > 0".to_string();
    let mut params = vec![request.restaurant_id];
    if let Some(cat) = request.category_id { query.push_str(" AND category_id = ?"); params.push(cat); }
    query.push_str(" ORDER BY name");

    match fetch_inventory_items(&query, &params, &db).await {
        Ok(items) => {
            let mut valuations = Vec::new();
            let mut total_value = 0.0;
            for item in items {
                let v = match method {
                    ValuationMethod::Fifo => calculate_fifo_valuation(&item, &db).await?,
                    ValuationMethod::Lifo => calculate_lifo_valuation(&item, &db).await?,
                    ValuationMethod::WeightedAverage => calculate_weighted_average_valuation(&item, &db).await?,
                    ValuationMethod::StandardCost => calculate_standard_cost_valuation(&item),
                };
                total_value += v.total_value;
                valuations.push(v);
            }
            Ok(ApiResponse { success: true, data: Some(ValuationSummary {
                total_inventory_value: total_value,
                total_items: valuations.len() as i64,
                valuation_method: method.as_str().to_string(),
                items: valuations,
            }), message: None, error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
    }
}
