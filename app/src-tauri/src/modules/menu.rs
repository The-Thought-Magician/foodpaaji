use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use sqlx::Row;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MenuCategory {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<i64>,
    pub slug: String,
    pub image_path: Option<String>,
    pub sort_order: i32,
    pub is_active: bool,
    pub display_in_menu: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MenuItem {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub category_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub short_description: Option<String>,
    pub price: f64,
    pub cost_price: Option<f64>,
    pub preparation_time: Option<i32>,
    pub calories: Option<i32>,
    pub image_path: Option<String>,
    pub slug: String,
    pub sku: Option<String>,
    pub is_vegetarian: bool,
    pub is_vegan: bool,
    pub is_gluten_free: bool,
    pub is_spicy: bool,
    pub spice_level: i32,
    pub is_available: bool,
    pub is_active: bool,
    pub is_featured: bool,
    pub sort_order: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMenuCategoryRequest {
    pub restaurant_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<i64>,
    pub image_path: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
    pub display_in_menu: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMenuCategoryRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent_id: Option<i64>,
    pub image_path: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
    pub display_in_menu: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMenuItemRequest {
    pub restaurant_id: i64,
    pub category_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub short_description: Option<String>,
    pub price: f64,
    pub preparation_time: Option<i32>,
    pub calories: Option<i32>,
    pub image_path: Option<String>,
    pub sku: Option<String>,
    pub is_vegetarian: Option<bool>,
    pub is_vegan: Option<bool>,
    pub is_gluten_free: Option<bool>,
    pub is_spicy: Option<bool>,
    pub spice_level: Option<i32>,
    pub is_available: Option<bool>,
    pub is_active: Option<bool>,
    pub is_featured: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMenuItemRequest {
    pub category_id: Option<i64>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub short_description: Option<String>,
    pub price: Option<f64>,
    pub preparation_time: Option<i32>,
    pub calories: Option<i32>,
    pub image_path: Option<String>,
    pub sku: Option<String>,
    pub is_vegetarian: Option<bool>,
    pub is_vegan: Option<bool>,
    pub is_gluten_free: Option<bool>,
    pub is_spicy: Option<bool>,
    pub spice_level: Option<i32>,
    pub is_available: Option<bool>,
    pub is_active: Option<bool>,
    pub is_featured: Option<bool>,
    pub sort_order: Option<i32>,
}

fn generate_slug(name: &str) -> String {
    name.to_lowercase()
        .replace(" ", "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect()
}

#[tauri::command]
pub async fn create_menu_category(
    request: CreateMenuCategoryRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuCategory>, String> {
    let slug = generate_slug(&request.name);
    
    let existing = sqlx::query(
        "SELECT id FROM menu_categories WHERE restaurant_id = ? AND slug = ?"
    )
    .bind(request.restaurant_id)
    .bind(&slug)
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if existing.is_some() {
        return Err("Category with this name already exists".to_string());
    }

    let result = sqlx::query(
        "INSERT INTO menu_categories (restaurant_id, name, description, parent_id, slug,
         image_path, sort_order, is_active, display_in_menu)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(&request.name)
    .bind(&request.description)
    .bind(request.parent_id)
    .bind(&slug)
    .bind(&request.image_path)
    .bind(request.sort_order.unwrap_or(0))
    .bind(request.is_active.unwrap_or(true))
    .bind(request.display_in_menu.unwrap_or(true))
    .execute(&*db)
    .await
    .map_err(|e| format!("Failed to create category: {}", e))?;

    let category_id = result.last_insert_rowid();
    get_menu_category_by_id(category_id, db).await
}

#[tauri::command]
pub async fn get_menu_categories(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuCategory>>, String> {
    let categories = sqlx::query_as::<_, MenuCategory>(
        "SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY sort_order, name"
    )
    .bind(restaurant_id)
    .fetch_all(&*db)
    .await
    .map_err(|e| format!("Failed to fetch categories: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some(categories),
        message: None,
        error: None,
    })
}

#[tauri::command]
pub async fn get_menu_category_by_id(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuCategory>, String> {
    let category = sqlx::query_as::<_, MenuCategory>("SELECT * FROM menu_categories WHERE id = ?")
        .bind(id)
        .fetch_optional(&*db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    match category {
        Some(cat) => Ok(ApiResponse {
            success: true,
            data: Some(cat),
            message: None,
            error: None,
        }),
        None => Err("Category not found".to_string()),
    }
}

#[tauri::command]
pub async fn update_menu_category(
    id: i64,
    request: UpdateMenuCategoryRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuCategory>, String> {
    let mut set_clauses = Vec::new();

    if let Some(ref name) = request.name {
        sqlx::query("UPDATE menu_categories SET name = ? WHERE id = ?")
            .bind(name)
            .bind(id)
            .execute(&*db)
            .await
            .map_err(|e| format!("Failed to update category: {}", e))?;
        set_clauses.push("name");
    }

    if let Some(ref description) = request.description {
        sqlx::query("UPDATE menu_categories SET description = ? WHERE id = ?")
            .bind(description)
            .bind(id)
            .execute(&*db)
            .await
            .map_err(|e| format!("Failed to update category: {}", e))?;
        set_clauses.push("description");
    }

    if let Some(parent_id) = request.parent_id {
        sqlx::query("UPDATE menu_categories SET parent_id = ? WHERE id = ?")
            .bind(parent_id)
            .bind(id)
            .execute(&*db)
            .await
            .map_err(|e| format!("Failed to update category: {}", e))?;
        set_clauses.push("parent_id");
    }

    if let Some(ref image_path) = request.image_path {
        sqlx::query("UPDATE menu_categories SET image_path = ? WHERE id = ?")
            .bind(image_path)
            .bind(id)
            .execute(&*db)
            .await
            .map_err(|e| format!("Failed to update category: {}", e))?;
        set_clauses.push("image_path");
    }

    if let Some(sort_order) = request.sort_order {
        sqlx::query("UPDATE menu_categories SET sort_order = ? WHERE id = ?")
            .bind(sort_order)
            .bind(id)
            .execute(&*db)
            .await
            .map_err(|e| format!("Failed to update category: {}", e))?;
        set_clauses.push("sort_order");
    }

    if let Some(is_active) = request.is_active {
        sqlx::query("UPDATE menu_categories SET is_active = ? WHERE id = ?")
            .bind(is_active)
            .bind(id)
            .execute(&*db)
            .await
            .map_err(|e| format!("Failed to update category: {}", e))?;
        set_clauses.push("is_active");
    }

    if let Some(display_in_menu) = request.display_in_menu {
        sqlx::query("UPDATE menu_categories SET display_in_menu = ? WHERE id = ?")
            .bind(display_in_menu)
            .bind(id)
            .execute(&*db)
            .await
            .map_err(|e| format!("Failed to update category: {}", e))?;
        set_clauses.push("display_in_menu");
    }

    if set_clauses.is_empty() {
        return get_menu_category_by_id(id, db).await;
    }

    get_menu_category_by_id(id, db).await
}

#[tauri::command]
pub async fn delete_menu_category(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let has_items = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM menu_items WHERE category_id = ?"
    )
    .bind(id)
    .fetch_one(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if has_items > 0 {
        return Err("Cannot delete category with existing menu items".to_string());
    }

    sqlx::query("DELETE FROM menu_categories WHERE id = ?")
        .bind(id)
        .execute(&*db)
        .await
        .map_err(|e| format!("Failed to delete category: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some("Category deleted successfully".to_string()),
        message: None,
        error: None,
    })
}

#[tauri::command]
pub async fn create_menu_item(
    request: CreateMenuItemRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    let slug = generate_slug(&request.name);
    
    let existing = sqlx::query(
        "SELECT id FROM menu_items WHERE restaurant_id = ? AND slug = ?"
    )
    .bind(request.restaurant_id)
    .bind(&slug)
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if existing.is_some() {
        return Err("Menu item with this name already exists".to_string());
    }

    let result = sqlx::query(
        "INSERT INTO menu_items (restaurant_id, category_id, name, description, short_description,
         price, preparation_time, calories, image_path, slug, sku, is_vegetarian, is_vegan,
         is_gluten_free, is_spicy, spice_level, is_available, is_active, is_featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(request.category_id)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.short_description)
    .bind(request.price)
    .bind(request.preparation_time)
    .bind(request.calories)
    .bind(&request.image_path)
    .bind(&slug)
    .bind(&request.sku)
    .bind(request.is_vegetarian.unwrap_or(false))
    .bind(request.is_vegan.unwrap_or(false))
    .bind(request.is_gluten_free.unwrap_or(false))
    .bind(request.is_spicy.unwrap_or(false))
    .bind(request.spice_level.unwrap_or(0))
    .bind(request.is_available.unwrap_or(true))
    .bind(request.is_active.unwrap_or(true))
    .bind(request.is_featured.unwrap_or(false))
    .bind(request.sort_order.unwrap_or(0))
    .execute(&*db)
    .await
    .map_err(|e| format!("Failed to create menu item: {}", e))?;

    let item_id = result.last_insert_rowid();
    get_menu_item_by_id(item_id, db).await
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
        )
        .bind(restaurant_id)
        .bind(cat_id)
        .fetch_all(&*db)
        .await,
        None => sqlx::query_as::<_, MenuItem>(
            "SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY sort_order, name"
        )
        .bind(restaurant_id)
        .fetch_all(&*db)
        .await,
    }
    .map_err(|e| format!("Failed to fetch menu items: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some(items),
        message: None,
        error: None,
    })
}

#[tauri::command]
pub async fn update_menu_item(
    id: i64,
    request: UpdateMenuItemRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    if let Some(ref name) = request.name {
        sqlx::query("UPDATE menu_items SET name = ? WHERE id = ?")
            .bind(name).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.category_id {
        sqlx::query("UPDATE menu_items SET category_id = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(ref v) = request.description {
        sqlx::query("UPDATE menu_items SET description = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.price {
        sqlx::query("UPDATE menu_items SET price = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.is_available {
        sqlx::query("UPDATE menu_items SET is_available = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.is_vegetarian {
        sqlx::query("UPDATE menu_items SET is_vegetarian = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.is_spicy {
        sqlx::query("UPDATE menu_items SET is_spicy = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    if let Some(v) = request.preparation_time {
        sqlx::query("UPDATE menu_items SET preparation_time = ? WHERE id = ?")
            .bind(v).bind(id).execute(&*db).await
            .map_err(|e| format!("Failed to update: {}", e))?;
    }
    get_menu_item_by_id(id, db).await
}

#[tauri::command]
pub async fn get_menu_item_by_id(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    let item = sqlx::query_as::<_, MenuItem>("SELECT * FROM menu_items WHERE id = ?")
        .bind(id)
        .fetch_optional(&*db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    match item {
        Some(item) => Ok(ApiResponse {
            success: true,
            data: Some(item),
            message: None,
            error: None,
        }),
        None => Err("Menu item not found".to_string()),
    }
}

#[tauri::command]
pub async fn delete_menu_item(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    sqlx::query("DELETE FROM menu_items WHERE id = ?")
        .bind(id)
        .execute(&*db)
        .await
        .map_err(|e| format!("Failed to delete menu item: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some("Menu item deleted successfully".to_string()),
        message: None,
        error: None,
    })
}