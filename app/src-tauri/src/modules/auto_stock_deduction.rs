use crate::database::DbPool;
use crate::types::{CreateStockMovementRequest, ApiResponse};
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use sqlx::Row;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MenuItemIngredient {
    pub id: Option<i64>,
    pub menu_item_id: i64,
    pub inventory_item_id: i64,
    pub quantity_required: f64,
    pub unit: String,
    pub cost_per_unit: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderItem {
    pub menu_item_id: i64,
    pub quantity: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderCompletionRequest {
    pub restaurant_id: i64,
    pub order_id: i64,
    pub order_items: Vec<OrderItem>,
    pub user_id: i64,
}

#[derive(Debug, Serialize)]
pub struct StockDeductionResult {
    pub total_items_processed: i64,
    pub successful_deductions: i64,
    pub failed_deductions: i64,
    pub insufficient_stock_items: Vec<InsufficientStockItem>,
    pub deduction_details: Vec<DeductionDetail>,
}

#[derive(Debug, Serialize, Clone)]
pub struct InsufficientStockItem {
    pub inventory_item_id: i64,
    pub item_name: String,
    pub required_quantity: f64,
    pub available_quantity: f64,
    pub shortage: f64,
}

#[derive(Debug, Serialize)]
pub struct DeductionDetail {
    pub inventory_item_id: i64,
    pub item_name: String,
    pub deducted_quantity: f64,
    pub remaining_stock: f64,
    pub movement_id: Option<i64>,
}

#[derive(Deserialize)]
pub struct RecipeIngredient {
    pub inventory_item_id: i64,
    pub quantity: f64,
    pub unit: String,
}

#[derive(Deserialize)]
pub struct CreateRecipeRequest {
    pub restaurant_id: i64,
    pub menu_item_id: i64,
    pub ingredients: Vec<RecipeIngredient>,
}

#[tauri::command]
pub async fn process_order_completion(
    request: OrderCompletionRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<StockDeductionResult>, String> {
    let mut total_items = 0i64;
    let mut successful = 0i64;
    let mut failed = 0i64;
    let mut insufficient_items = Vec::new();
    let mut deduction_details = Vec::new();

    for order_item in &request.order_items {
        let ingredients = get_menu_item_ingredients(order_item.menu_item_id, &db).await?;
        
        for ingredient in ingredients {
            total_items += 1;
            let required_quantity = ingredient.quantity_required * order_item.quantity as f64;
            
            match check_stock_availability(ingredient.inventory_item_id, required_quantity, &db).await {
                Ok((available, item_name)) => {
                    if available >= required_quantity {
                        match deduct_inventory_stock(
                            request.restaurant_id,
                            ingredient.inventory_item_id,
                            required_quantity,
                            request.order_id,
                            request.user_id,
                            &db
                        ).await {
                            Ok((movement_id, remaining_stock)) => {
                                successful += 1;
                                deduction_details.push(DeductionDetail {
                                    inventory_item_id: ingredient.inventory_item_id,
                                    item_name,
                                    deducted_quantity: required_quantity,
                                    remaining_stock,
                                    movement_id: Some(movement_id),
                                });
                            },
                            Err(_) => {
                                failed += 1;
                            }
                        }
                    } else {
                        failed += 1;
                        insufficient_items.push(InsufficientStockItem {
                            inventory_item_id: ingredient.inventory_item_id,
                            item_name,
                            required_quantity,
                            available_quantity: available,
                            shortage: required_quantity - available,
                        });
                    }
                },
                Err(_) => {
                    failed += 1;
                }
            }
        }
    }

    let result = StockDeductionResult {
        total_items_processed: total_items,
        successful_deductions: successful,
        failed_deductions: failed,
        insufficient_stock_items: insufficient_items,
        deduction_details,
    };

    Ok(ApiResponse {
        success: failed == 0,
        data: Some(result),
        message: Some(format!("Processed {} items, {} successful, {} failed", 
                             total_items, successful, failed)),
        error: if failed > 0 { 
            Some("Some items could not be deducted due to insufficient stock".to_string()) 
        } else { 
            None 
        },
    })
}

async fn get_menu_item_ingredients(
    menu_item_id: i64,
    db: &DbPool,
) -> Result<Vec<MenuItemIngredient>, String> {
    sqlx::query_as::<_, MenuItemIngredient>(
        "SELECT id, menu_item_id, inventory_item_id, quantity_required, unit, cost_per_unit
         FROM menu_item_ingredients WHERE menu_item_id = ?"
    )
    .bind(menu_item_id)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Failed to fetch ingredients: {}", e))
}

async fn check_stock_availability(
    inventory_item_id: i64,
    required_quantity: f64,
    db: &DbPool,
) -> Result<(f64, String), String> {
    let result = sqlx::query(
        "SELECT current_stock, name FROM inventory_items WHERE id = ? AND is_active = 1"
    )
    .bind(inventory_item_id)
    .fetch_optional(db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    match result {
        Some(row) => {
            let current_stock: f64 = row.try_get("current_stock")
                .map_err(|e| format!("Failed to get current_stock: {}", e))?;
            let name: String = row.try_get("name")
                .map_err(|e| format!("Failed to get name: {}", e))?;
            Ok((current_stock, name))
        },
        None => Err("Inventory item not found or inactive".to_string()),
    }
}

async fn deduct_inventory_stock(
    restaurant_id: i64,
    inventory_item_id: i64,
    quantity: f64,
    order_id: i64,
    user_id: i64,
    db: &DbPool,
) -> Result<(i64, f64), String> {
    let cost_info = sqlx::query(
        "SELECT cost_price FROM inventory_items WHERE id = ?"
    )
    .bind(inventory_item_id)
    .fetch_optional(db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let unit_cost = cost_info
        .map(|row| row.try_get("cost_price").unwrap_or(0.0))
        .unwrap_or(0.0);
    let total_cost = unit_cost * quantity;

    let movement_request = CreateStockMovementRequest {
        restaurant_id,
        inventory_item_id,
        movement_type: "OUT".to_string(),
        quantity,
        unit_cost: Some(unit_cost),
        reference_type: Some("ORDER_COMPLETION".to_string()),
        reference_id: Some(order_id),
        batch_number: None,
        expiry_date: None,
        notes: Some(format!("Auto deduction for order #{}", order_id)),
        user_id: Some(user_id),
    };

    match sqlx::query(
        "INSERT INTO stock_movements (restaurant_id, inventory_item_id, movement_type,
         quantity, unit_cost, total_cost, reference_type, reference_id, notes,
         user_id, movement_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(movement_request.restaurant_id)
    .bind(movement_request.inventory_item_id)
    .bind(&movement_request.movement_type)
    .bind(movement_request.quantity)
    .bind(movement_request.unit_cost)
    .bind(total_cost)
    .bind(&movement_request.reference_type)
    .bind(movement_request.reference_id)
    .bind(&movement_request.notes)
    .bind(movement_request.user_id)
    .bind(Utc::now().naive_utc())
    .execute(db)
    .await
    {
        Ok(result) => {
            let movement_id = result.last_insert_rowid();
            
            let remaining_stock = sqlx::query_scalar::<_, f64>(
                "SELECT current_stock FROM inventory_items WHERE id = ?"
            )
            .bind(inventory_item_id)
            .fetch_one(db)
            .await
            .map_err(|e| format!("Failed to get remaining stock: {}", e))?;

            Ok((movement_id, remaining_stock))
        },
        Err(e) => Err(format!("Failed to create stock movement: {}", e))
    }
}

#[derive(Deserialize)]
pub struct StockValidationRequest {
    pub restaurant_id: i64,
    pub order_items: Vec<OrderItem>,
}

#[tauri::command]
pub async fn validate_stock_availability(
    request: StockValidationRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<InsufficientStockItem>>, String> {
    let mut insufficient_items = Vec::new();

    for order_item in &request.order_items {
        let ingredients = get_menu_item_ingredients(order_item.menu_item_id, &db).await?;
        
        for ingredient in ingredients {
            let required_quantity = ingredient.quantity_required * order_item.quantity as f64;
            
            match check_stock_availability(ingredient.inventory_item_id, required_quantity, &db).await {
                Ok((available, item_name)) => {
                    if available < required_quantity {
                        insufficient_items.push(InsufficientStockItem {
                            inventory_item_id: ingredient.inventory_item_id,
                            item_name,
                            required_quantity,
                            available_quantity: available,
                            shortage: required_quantity - available,
                        });
                    }
                },
                Err(_) => {
                    continue;
                }
            }
        }
    }

    Ok(ApiResponse {
        success: true,
        data: Some(insufficient_items.clone()),
        message: if insufficient_items.is_empty() {
            Some("All required items are available in sufficient quantity".to_string())
        } else {
            Some(format!("{} items have insufficient stock", insufficient_items.len()))
        },
        error: None,
    })
}

#[tauri::command]
pub async fn create_menu_recipe(
    request: CreateRecipeRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    sqlx::query("DELETE FROM menu_item_ingredients WHERE menu_item_id = ?")
        .bind(request.menu_item_id)
        .execute(&*db)
        .await
        .map_err(|e| format!("Failed to clear existing recipe: {}", e))?;

    for ingredient in &request.ingredients {
        let cost_per_unit = sqlx::query_scalar::<_, f64>(
            "SELECT cost_price FROM inventory_items WHERE id = ?"
        )
        .bind(ingredient.inventory_item_id)
        .fetch_optional(&*db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        sqlx::query(
            "INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id,
             quantity_required, unit, cost_per_unit) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(request.menu_item_id)
        .bind(ingredient.inventory_item_id)
        .bind(ingredient.quantity)
        .bind(&ingredient.unit)
        .bind(cost_per_unit)
        .execute(&*db)
        .await
        .map_err(|e| format!("Failed to add ingredient: {}", e))?;
    }

    Ok(ApiResponse {
        success: true,
        data: Some("Recipe created successfully".to_string()),
        message: Some(format!("Added {} ingredients to menu item", request.ingredients.len())),
        error: None,
    })
}

#[tauri::command]
pub async fn get_menu_recipe(
    menu_item_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuItemIngredient>>, String> {
    match get_menu_item_ingredients(menu_item_id, &db).await {
        Ok(ingredients) => Ok(ApiResponse {
            success: true,
            data: Some(ingredients),
            message: None,
            error: None,
        }),
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(e),
        })
    }
}