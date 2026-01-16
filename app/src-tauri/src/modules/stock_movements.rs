use crate::database::DbPool;
use crate::types::{StockMovement, CreateStockMovementRequest, ApiResponse};
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Clone)]
pub enum MovementType {
    In,
    Out,
    Adjustment,
    Transfer,
    Waste,
    Return,
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

#[derive(Deserialize)]
pub struct StockMovementSearchRequest {
    pub restaurant_id: i64,
    pub inventory_item_id: Option<i64>,
    pub movement_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct StockMovementResponse {
    pub movements: Vec<StockMovementWithItem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct StockMovementWithItem {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
    pub item_name: String,
    pub item_sku: Option<String>,
    pub movement_type: String,
    pub quantity: f64,
    pub unit_cost: Option<f64>,
    pub total_cost: Option<f64>,
    pub reference_type: Option<String>,
    pub reference_id: Option<i64>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub notes: Option<String>,
    pub user_id: Option<i64>,
    pub movement_date: Option<chrono::DateTime<Utc>>,
    pub created_at: Option<chrono::DateTime<Utc>>,
}

#[tauri::command]
pub async fn create_stock_movement(
    request: CreateStockMovementRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<StockMovement>, String> {
    if !is_valid_movement_type(&request.movement_type) {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid movement type".to_string()),
        });
    }

    if request.quantity <= 0.0 {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Quantity must be greater than zero".to_string()),
        });
    }

    let total_cost = match request.unit_cost {
        Some(cost) => Some(cost * request.quantity),
        None => None,
    };

    match sqlx::query(
        "INSERT INTO stock_movements (restaurant_id, inventory_item_id, movement_type, 
         quantity, unit_cost, total_cost, reference_type, reference_id, batch_number, 
         expiry_date, notes, user_id, movement_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(request.inventory_item_id)
    .bind(&request.movement_type)
    .bind(request.quantity)
    .bind(request.unit_cost)
    .bind(total_cost)
    .bind(&request.reference_type)
    .bind(request.reference_id)
    .bind(&request.batch_number)
    .bind(&request.expiry_date)
    .bind(&request.notes)
    .bind(request.user_id)
    .bind(Utc::now().naive_utc())
    .execute(&*db)
    .await
    {
        Ok(result) => {
            let movement_id = result.last_insert_rowid();
            match get_stock_movement_by_id(movement_id, &db).await {
                Ok(movement) => Ok(ApiResponse {
                    success: true,
                    data: Some(movement),
                    message: Some("Stock movement recorded successfully".to_string()),
                    error: None,
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(e),
                })
            }
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn get_stock_movements(
    request: StockMovementSearchRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<StockMovementResponse>, String> {
    let page = request.page.unwrap_or(1);
    let limit = request.limit.unwrap_or(50);
    let offset = (page - 1) * limit;

    let mut query = "SELECT sm.id, sm.restaurant_id, sm.inventory_item_id, ii.name as item_name, 
                     ii.sku as item_sku, sm.movement_type, sm.quantity, sm.unit_cost, 
                     sm.total_cost, sm.reference_type, sm.reference_id, sm.batch_number, 
                     sm.expiry_date, sm.notes, sm.user_id, sm.movement_date, sm.created_at
                     FROM stock_movements sm 
                     JOIN inventory_items ii ON sm.inventory_item_id = ii.id 
                     WHERE sm.restaurant_id = ?".to_string();

    let mut count_query = "SELECT COUNT(*) FROM stock_movements sm 
                          JOIN inventory_items ii ON sm.inventory_item_id = ii.id 
                          WHERE sm.restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(item_id) = request.inventory_item_id {
        query.push_str(" AND sm.inventory_item_id = ?");
        count_query.push_str(" AND sm.inventory_item_id = ?");
        params.push(item_id.to_string());
    }

    if let Some(movement_type) = &request.movement_type {
        if !movement_type.trim().is_empty() {
            query.push_str(" AND sm.movement_type = ?");
            count_query.push_str(" AND sm.movement_type = ?");
            params.push(movement_type.to_uppercase());
        }
    }

    if let Some(start_date) = &request.start_date {
        query.push_str(" AND DATE(sm.movement_date) >= ?");
        count_query.push_str(" AND DATE(sm.movement_date) >= ?");
        params.push(start_date.clone());
    }

    if let Some(end_date) = &request.end_date {
        query.push_str(" AND DATE(sm.movement_date) <= ?");
        count_query.push_str(" AND DATE(sm.movement_date) <= ?");
        params.push(end_date.clone());
    }

    query.push_str(" ORDER BY sm.movement_date DESC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let total_result = sqlx::query_scalar::<_, i64>(&count_query);
    let mut total_query = total_result;
    for param in params.iter().take(params.len() - 2) {
        total_query = total_query.bind(param);
    }

    let movements_result = sqlx::query_as::<_, StockMovementWithItem>(&query);
    let mut movements_query = movements_result;
    for param in &params {
        movements_query = movements_query.bind(param);
    }

    match tokio::try_join!(
        total_query.fetch_one(&*db),
        movements_query.fetch_all(&*db)
    ) {
        Ok((total, movements)) => Ok(ApiResponse {
            success: true,
            data: Some(StockMovementResponse {
                movements,
                total,
                page,
                limit,
            }),
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

#[derive(Deserialize)]
pub struct StockAdjustmentRequest {
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
    pub new_stock_level: f64,
    pub reason: String,
    pub user_id: i64,
}

#[tauri::command]
pub async fn adjust_stock_level(
    request: StockAdjustmentRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let current_stock_result = sqlx::query_scalar::<_, f64>(
        "SELECT current_stock FROM inventory_items WHERE id = ? AND restaurant_id = ?"
    )
    .bind(request.inventory_item_id)
    .bind(request.restaurant_id)
    .fetch_optional(&*db)
    .await;

    match current_stock_result {
        Ok(Some(current_stock)) => {
            let adjustment_quantity = request.new_stock_level - current_stock;
            
            if adjustment_quantity != 0.0 {
                let movement_request = CreateStockMovementRequest {
                    restaurant_id: request.restaurant_id,
                    inventory_item_id: request.inventory_item_id,
                    movement_type: MovementType::Adjustment.as_str().to_string(),
                    quantity: adjustment_quantity.abs(),
                    unit_cost: None,
                    reference_type: Some("MANUAL_ADJUSTMENT".to_string()),
                    reference_id: None,
                    batch_number: None,
                    expiry_date: None,
                    notes: Some(request.reason),
                    user_id: Some(request.user_id),
                };

                match create_stock_movement(movement_request, db).await {
                    Ok(response) => {
                        if response.success {
                            Ok(ApiResponse {
                                success: true,
                                data: Some(format!("Stock adjusted by {:.2} units", adjustment_quantity)),
                                message: Some("Stock level adjusted successfully".to_string()),
                                error: None,
                            })
                        } else {
                            Ok(response.error.map_or_else(
                                || ApiResponse {
                                    success: false,
                                    data: None,
                                    message: None,
                                    error: Some("Failed to create stock movement".to_string()),
                                },
                                |error| ApiResponse {
                                    success: false,
                                    data: None,
                                    message: None,
                                    error: Some(error),
                                }
                            ))
                        }
                    },
                    Err(e) => Ok(ApiResponse {
                        success: false,
                        data: None,
                        message: None,
                        error: Some(format!("Failed to adjust stock: {}", e)),
                    })
                }
            } else {
                Ok(ApiResponse {
                    success: true,
                    data: Some("No adjustment needed".to_string()),
                    message: Some("Current stock level matches target level".to_string()),
                    error: None,
                })
            }
        },
        Ok(None) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Inventory item not found".to_string()),
        }),
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

async fn get_stock_movement_by_id(id: i64, db: &DbPool) -> Result<StockMovement, String> {
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

fn is_valid_movement_type(movement_type: &str) -> bool {
    matches!(movement_type.to_uppercase().as_str(), 
        "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "WASTE" | "RETURN")
}