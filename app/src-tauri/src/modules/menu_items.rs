use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::menu_types::{MenuItem, CreateMenuItemRequest, UpdateMenuItemRequest, generate_slug};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn create_menu_item(
    request: CreateMenuItemRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    let slug = generate_slug(&request.name);
    let existing = sqlx::query("SELECT id FROM menu_items WHERE restaurant_id = ? AND slug = ?")
        .bind(request.restaurant_id).bind(&slug)
        .fetch_optional(&*db).await
        .map_err(|e| format!("Database error: {}", e))?;
    if existing.is_some() {
        return Err("Menu item with this name already exists".to_string());
    }

    let result = sqlx::query(
        "INSERT INTO menu_items (restaurant_id, category_id, name, description, short_description,
         price, preparation_time, calories, image_path, slug, sku, is_vegetarian, is_vegan,
         is_gluten_free, is_spicy, spice_level, is_available, is_active, is_featured, sort_order, kitchen_station)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(request.category_id).bind(&request.name)
    .bind(&request.description).bind(&request.short_description).bind(request.price)
    .bind(request.preparation_time).bind(request.calories).bind(&request.image_path)
    .bind(&slug).bind(&request.sku)
    .bind(request.is_vegetarian.unwrap_or(false)).bind(request.is_vegan.unwrap_or(false))
    .bind(request.is_gluten_free.unwrap_or(false)).bind(request.is_spicy.unwrap_or(false))
    .bind(request.spice_level.unwrap_or(0)).bind(request.is_available.unwrap_or(true))
    .bind(request.is_active.unwrap_or(true)).bind(request.is_featured.unwrap_or(false))
    .bind(request.sort_order.unwrap_or(0)).bind(&request.kitchen_station)
    .execute(&*db).await
    .map_err(|e| format!("Failed to create menu item: {}", e))?;

    get_menu_item_by_id(result.last_insert_rowid(), db).await
}

#[tauri::command]
pub async fn get_menu_items_by_category(
    restaurant_id: i64,
    category_id: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuItem>>, String> {
    let items = match category_id {
        Some(cat_id) => sqlx::query_as::<_, MenuItem>(
            "SELECT * FROM menu_items WHERE restaurant_id = ? AND category_id = ? ORDER BY sort_order, name"
        ).bind(restaurant_id).bind(cat_id).fetch_all(&*db).await,
        None => sqlx::query_as::<_, MenuItem>(
            "SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY sort_order, name"
        ).bind(restaurant_id).fetch_all(&*db).await,
    }
    .map_err(|e| format!("Failed to fetch menu items: {}", e))?;
    Ok(ApiResponse { success: true, data: Some(items), message: None, error: None })
}

#[tauri::command]
pub async fn get_menu_item_by_id(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    let item = sqlx::query_as::<_, MenuItem>("SELECT * FROM menu_items WHERE id = ?")
        .bind(id).fetch_optional(&*db).await
        .map_err(|e| format!("Database error: {}", e))?;
    match item {
        Some(item) => Ok(ApiResponse { success: true, data: Some(item), message: None, error: None }),
        None => Err("Menu item not found".to_string()),
    }
}

#[tauri::command]
pub async fn update_menu_item(
    id: i64,
    request: UpdateMenuItemRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    if let Some(ref name) = request.name {
        sqlx::query("UPDATE menu_items SET name = ? WHERE id = ?")
            .bind(name).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.category_id {
        sqlx::query("UPDATE menu_items SET category_id = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(ref v) = request.description {
        sqlx::query("UPDATE menu_items SET description = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.price {
        sqlx::query("UPDATE menu_items SET price = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.is_available {
        sqlx::query("UPDATE menu_items SET is_available = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.is_vegetarian {
        sqlx::query("UPDATE menu_items SET is_vegetarian = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.is_spicy {
        sqlx::query("UPDATE menu_items SET is_spicy = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.preparation_time {
        sqlx::query("UPDATE menu_items SET preparation_time = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(ref v) = request.kitchen_station {
        let val = if v.is_empty() { None::<&str> } else { Some(v.as_str()) };
        sqlx::query("UPDATE menu_items SET kitchen_station = ? WHERE id = ?")
            .bind(val).bind(id).execute(&*db).await.map_err(|e| format!("Failed to update: {}", e))?;
    }
    get_menu_item_by_id(id, db).await
}

#[tauri::command]
pub async fn delete_menu_item(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    sqlx::query("DELETE FROM menu_items WHERE id = ?")
        .bind(id).execute(&*db).await
        .map_err(|e| format!("Failed to delete menu item: {}", e))?;
    Ok(ApiResponse { success: true, data: Some("Menu item deleted successfully".to_string()), message: None, error: None })
}

#[tauri::command]
pub async fn duplicate_menu_item(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    let source = sqlx::query(
        "SELECT restaurant_id, category_id, name, description, short_description, price,
         preparation_time, calories, is_vegetarian, is_vegan, is_gluten_free, is_spicy,
         spice_level, is_available, is_active, is_featured, sort_order, kitchen_station
         FROM menu_items WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?
    .ok_or_else(|| "Menu item not found".to_string())?;

    let name: String = source.get("name");
    let new_name = format!("{} (Copy)", name);
    let slug = generate_slug(&new_name);

    let result = sqlx::query(
        "INSERT INTO menu_items (restaurant_id, category_id, name, description, short_description,
         price, preparation_time, calories, slug, is_vegetarian, is_vegan, is_gluten_free,
         is_spicy, spice_level, is_available, is_active, is_featured, sort_order, kitchen_station)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(source.get::<i64, _>("restaurant_id"))
    .bind(source.get::<Option<i64>, _>("category_id"))
    .bind(&new_name)
    .bind(source.get::<Option<String>, _>("description"))
    .bind(source.get::<Option<String>, _>("short_description"))
    .bind(source.get::<f64, _>("price"))
    .bind(source.get::<Option<i64>, _>("preparation_time"))
    .bind(source.get::<Option<i64>, _>("calories"))
    .bind(&slug)
    .bind(source.get::<bool, _>("is_vegetarian"))
    .bind(source.get::<bool, _>("is_vegan"))
    .bind(source.get::<bool, _>("is_gluten_free"))
    .bind(source.get::<bool, _>("is_spicy"))
    .bind(source.get::<i64, _>("spice_level"))
    .bind(source.get::<bool, _>("is_available"))
    .bind(source.get::<bool, _>("is_active"))
    .bind(source.get::<bool, _>("is_featured"))
    .bind(source.get::<i64, _>("sort_order"))
    .bind(source.get::<Option<String>, _>("kitchen_station"))
    .execute(&*db)
    .await
    .map_err(|e| format!("Failed to duplicate: {}", e))?;

    get_menu_item_by_id(result.last_insert_rowid(), db).await
}
