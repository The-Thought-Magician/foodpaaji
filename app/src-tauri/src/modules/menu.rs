use crate::database::DbPool;
use crate::types::ApiResponse;
use sqlx::Row;
use crate::modules::menu_types::{MenuCategory, CreateMenuCategoryRequest, UpdateMenuCategoryRequest, generate_slug};
use tauri::State;

#[tauri::command]
pub async fn create_menu_category(
    request: CreateMenuCategoryRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuCategory>, String> {
    let slug = generate_slug(&request.name);
    let existing = sqlx::query("SELECT id FROM menu_categories WHERE restaurant_id = ? AND slug = ?")
        .bind(request.restaurant_id).bind(&slug)
        .fetch_optional(&*db).await
        .map_err(|e| format!("Database error: {}", e))?;
    if existing.is_some() {
        return Err("Category with this name already exists".to_string());
    }

    let result = sqlx::query(
        "INSERT INTO menu_categories (restaurant_id, name, description, parent_id, slug,
         image_path, sort_order, is_active, display_in_menu)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(&request.name).bind(&request.description)
    .bind(request.parent_id).bind(&slug).bind(&request.image_path)
    .bind(request.sort_order.unwrap_or(0)).bind(request.is_active.unwrap_or(true))
    .bind(request.display_in_menu.unwrap_or(true))
    .execute(&*db).await
    .map_err(|e| format!("Failed to create category: {}", e))?;

    get_menu_category_by_id(result.last_insert_rowid(), db).await
}

#[tauri::command]
pub async fn get_menu_categories(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuCategory>>, String> {
    let categories = sqlx::query_as::<_, MenuCategory>(
        "SELECT mc.*, COUNT(mi.id) as item_count FROM menu_categories mc LEFT JOIN menu_items mi ON mi.category_id = mc.id WHERE mc.restaurant_id = ? GROUP BY mc.id ORDER BY mc.sort_order, mc.name"
    )
    .bind(restaurant_id).fetch_all(&*db).await
    .map_err(|e| format!("Failed to fetch categories: {}", e))?;
    Ok(ApiResponse { success: true, data: Some(categories), message: None, error: None })
}

#[tauri::command]
pub async fn get_menu_category_by_id(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuCategory>, String> {
    let category = sqlx::query_as::<_, MenuCategory>("SELECT * FROM menu_categories WHERE id = ?")
        .bind(id).fetch_optional(&*db).await
        .map_err(|e| format!("Database error: {}", e))?;
    match category {
        Some(cat) => Ok(ApiResponse { success: true, data: Some(cat), message: None, error: None }),
        None => Err("Category not found".to_string()),
    }
}

#[tauri::command]
pub async fn update_menu_category(
    id: i64,
    request: UpdateMenuCategoryRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuCategory>, String> {
    if let Some(ref name) = request.name {
        sqlx::query("UPDATE menu_categories SET name = ? WHERE id = ?")
            .bind(name).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update category: {}", e))?;
    }
    if let Some(ref description) = request.description {
        sqlx::query("UPDATE menu_categories SET description = ? WHERE id = ?")
            .bind(description).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update category: {}", e))?;
    }
    if let Some(parent_id) = request.parent_id {
        sqlx::query("UPDATE menu_categories SET parent_id = ? WHERE id = ?")
            .bind(parent_id).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update category: {}", e))?;
    }
    if let Some(ref image_path) = request.image_path {
        sqlx::query("UPDATE menu_categories SET image_path = ? WHERE id = ?")
            .bind(image_path).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update category: {}", e))?;
    }
    if let Some(sort_order) = request.sort_order {
        sqlx::query("UPDATE menu_categories SET sort_order = ? WHERE id = ?")
            .bind(sort_order).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update category: {}", e))?;
    }
    if let Some(is_active) = request.is_active {
        sqlx::query("UPDATE menu_categories SET is_active = ? WHERE id = ?")
            .bind(is_active).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update category: {}", e))?;
    }
    if let Some(display_in_menu) = request.display_in_menu {
        sqlx::query("UPDATE menu_categories SET display_in_menu = ? WHERE id = ?")
            .bind(display_in_menu).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update category: {}", e))?;
    }
    get_menu_category_by_id(id, db).await
}

#[tauri::command]
pub async fn delete_menu_category(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let has_items = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM menu_items WHERE category_id = ?")
        .bind(id).fetch_one(&*db).await
        .map_err(|e| format!("Database error: {}", e))?;
    if has_items > 0 {
        return Err("Cannot delete category with existing menu items".to_string());
    }
    sqlx::query("DELETE FROM menu_categories WHERE id = ?")
        .bind(id).execute(&*db).await
        .map_err(|e| format!("Failed to delete category: {}", e))?;
    Ok(ApiResponse { success: true, data: Some("Category deleted successfully".to_string()), message: None, error: None })
}

#[tauri::command]
pub async fn get_popular_menu_items(db: State<'_, DbPool>, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(10);
    let rows = sqlx::query(
        "SELECT bi.item_name, bi.menu_item_id, COUNT(*) as order_count, COALESCE(SUM(bi.quantity), 0) as total_qty, COALESCE(SUM(bi.total_price), 0.0) as total_revenue FROM bill_items bi WHERE bi.menu_item_id IS NOT NULL GROUP BY bi.menu_item_id, bi.item_name ORDER BY total_qty DESC LIMIT ?"
    ).bind(limit).fetch_all(&*db).await.map_err(|e| e.to_string())?;
    let data: Vec<serde_json::Value> = rows.into_iter().map(|r| serde_json::json!({
        "item_name": r.try_get::<String,_>("item_name").unwrap_or_default(),
        "menu_item_id": r.try_get::<i64,_>("menu_item_id").unwrap_or(0),
        "order_count": r.try_get::<i64,_>("order_count").unwrap_or(0),
        "total_qty": r.try_get::<i64,_>("total_qty").unwrap_or(0),
        "total_revenue": r.try_get::<f64,_>("total_revenue").unwrap_or(0.0),
    })).collect();
    Ok(serde_json::json!({ "success": true, "data": data }))
}
