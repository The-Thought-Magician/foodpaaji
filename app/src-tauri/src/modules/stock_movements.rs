use crate::database::DbPool;
use crate::types::{StockMovement, CreateStockMovementRequest, ApiResponse};
use tauri::State;
use chrono::Utc;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum MovementType {
    In, Out, Adjustment, Transfer, Waste, Return,
}

impl MovementType {
    pub fn as_str(&self) -> &'static str {
        match self {
            MovementType::In => "IN",
            MovementType::Out => "OUT",
            MovementType::Adjustment => "ADJUSTMENT",
            MovementType::Transfer => "TRANSFER",
            MovementType::Waste => "WASTE",
            MovementType::Return => "RETURN",
        }
    }
}

pub fn is_valid_movement_type(movement_type: &str) -> bool {
    matches!(movement_type.to_uppercase().as_str(),
        "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "WASTE" | "RETURN")
}

pub async fn get_stock_movement_by_id(id: i64, db: &DbPool) -> Result<StockMovement, String> {
    sqlx::query_as::<_, StockMovement>(
        "SELECT id, restaurant_id, inventory_item_id, movement_type, quantity,
         unit_cost, total_cost, reference_type, reference_id, batch_number,
         expiry_date, notes, user_id, movement_date, created_at
         FROM stock_movements WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub async fn create_stock_movement(
    request: CreateStockMovementRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<StockMovement>, String> {
    if !is_valid_movement_type(&request.movement_type) {
        return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Invalid movement type".to_string()) });
    }
    if request.quantity <= 0.0 {
        return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Quantity must be greater than zero".to_string()) });
    }

    let total_cost = request.unit_cost.map(|c| c * request.quantity);

    match sqlx::query(
        "INSERT INTO stock_movements (restaurant_id, inventory_item_id, movement_type,
         quantity, unit_cost, total_cost, reference_type, reference_id, batch_number,
         expiry_date, notes, user_id, movement_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(request.inventory_item_id).bind(&request.movement_type)
    .bind(request.quantity).bind(request.unit_cost).bind(total_cost)
    .bind(&request.reference_type).bind(request.reference_id).bind(&request.batch_number)
    .bind(&request.expiry_date).bind(&request.notes).bind(request.user_id)
    .bind(Utc::now().naive_utc())
    .execute(&*db).await {
        Ok(result) => {
            let movement_id = result.last_insert_rowid();
            match get_stock_movement_by_id(movement_id, &db).await {
                Ok(movement) => Ok(ApiResponse { success: true, data: Some(movement), message: Some("Stock movement recorded successfully".to_string()), error: None }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) })
            }
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) })
    }
}
