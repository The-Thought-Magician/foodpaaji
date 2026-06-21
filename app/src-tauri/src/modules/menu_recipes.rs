use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::auto_stock_deduction::{
    MenuItemIngredient, OrderItem, InsufficientStockItem,
    get_menu_item_ingredients, check_stock_availability,
};
use tauri::State;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct RecipeIngredient {
    pub inventory_item_id: i64,
    pub quantity: f64,
    pub unit: String,
}

#[derive(Deserialize)]
pub struct CreateRecipeRequest {
    #[allow(dead_code)]
    pub restaurant_id: i64,
    pub menu_item_id: i64,
    pub ingredients: Vec<RecipeIngredient>,
}

#[derive(Deserialize)]
pub struct StockValidationRequest {
    #[allow(dead_code)]
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
            let required = ingredient.quantity_required * order_item.quantity as f64;
            if let Ok((available, item_name)) = check_stock_availability(ingredient.inventory_item_id, required, &db).await {
                if available < required {
                    insufficient_items.push(InsufficientStockItem {
                        inventory_item_id: ingredient.inventory_item_id,
                        item_name, required_quantity: required,
                        available_quantity: available, shortage: required - available,
                    });
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
        Ok(ingredients) => Ok(ApiResponse { success: true, data: Some(ingredients), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) })
    }
}
