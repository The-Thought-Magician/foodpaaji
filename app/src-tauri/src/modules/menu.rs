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
    
    let existing = sqlx::query!(
        "SELECT id FROM menu_categories WHERE restaurant_id = ? AND slug = ?",
        request.restaurant_id, slug
    )
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if existing.is_some() {
        return Err("Category with this name already exists".to_string());
    }

    let result = sqlx::query!(
        "INSERT INTO menu_categories (restaurant_id, name, description, parent_id, slug, 
         image_path, sort_order, is_active, display_in_menu) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        request.restaurant_id,
        request.name,
        request.description,
        request.parent_id,
        slug,
        request.image_path,
        request.sort_order.unwrap_or(0),
        request.is_active.unwrap_or(true),
        request.display_in_menu.unwrap_or(true)
    )
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
    let categories = sqlx::query_as(
        MenuCategory,
        "SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY sort_order, name",
        restaurant_id
    )
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
    let category = sqlx::query_as::<_, MenuCategory>("SELECT * FROM menu_categories WHERE id = ?", id)
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
    let mut query_parts = Vec::new();
    let mut values: Vec<&dyn sqlx::Encode<sqlx::Sqlite>> = Vec::new();

    if let Some(ref name) = request.name {
        query_parts.push("name = ?");
        values.push(name);
    }
    if let Some(ref description) = request.description {
        query_parts.push("description = ?");
        values.push(description);
    }
    if request.parent_id.is_some() {
        query_parts.push("parent_id = ?");
        values.push(&request.parent_id);
    }
    if let Some(ref image_path) = request.image_path {
        query_parts.push("image_path = ?");
        values.push(image_path);
    }
    if let Some(ref sort_order) = request.sort_order {
        query_parts.push("sort_order = ?");
        values.push(sort_order);
    }
    if let Some(ref is_active) = request.is_active {
        query_parts.push("is_active = ?");
        values.push(is_active);
    }
    if let Some(ref display_in_menu) = request.display_in_menu {
        query_parts.push("display_in_menu = ?");
        values.push(display_in_menu);
    }

    if query_parts.is_empty() {
        return get_menu_category_by_id(id, db).await;
    }

    let query_str = format!("UPDATE menu_categories SET {} WHERE id = ?", query_parts.join(", "));
    
    let mut query = sqlx::query!(&query_str);
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(id);

    query.execute(&*db)
        .await
        .map_err(|e| format!("Failed to update category: {}", e))?;

    get_menu_category_by_id(id, db).await
}

#[tauri::command]
pub async fn delete_menu_category(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let has_items = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM menu_items WHERE category_id = ?", id
    )
    .fetch_one(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if has_items > 0 {
        return Err("Cannot delete category with existing menu items".to_string());
    }

    sqlx::query!("DELETE FROM menu_categories WHERE id = ?", id)
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
    
    let existing = sqlx::query!(
        "SELECT id FROM menu_items WHERE restaurant_id = ? AND slug = ?",
        request.restaurant_id, slug
    )
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if existing.is_some() {
        return Err("Menu item with this name already exists".to_string());
    }

    let result = sqlx::query!(
        "INSERT INTO menu_items (restaurant_id, category_id, name, description, short_description,
         price, preparation_time, calories, image_path, slug, sku, is_vegetarian, is_vegan,
         is_gluten_free, is_spicy, spice_level, is_available, is_active, is_featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        request.restaurant_id,
        request.category_id,
        request.name,
        request.description,
        request.short_description,
        request.price,
        request.preparation_time,
        request.calories,
        request.image_path,
        slug,
        request.sku,
        request.is_vegetarian.unwrap_or(false),
        request.is_vegan.unwrap_or(false),
        request.is_gluten_free.unwrap_or(false),
        request.is_spicy.unwrap_or(false),
        request.spice_level.unwrap_or(0),
        request.is_available.unwrap_or(true),
        request.is_active.unwrap_or(true),
        request.is_featured.unwrap_or(false),
        request.sort_order.unwrap_or(0)
    )
    .execute(&*db)
    .await
    .map_err(|e| format!("Failed to create menu item: {}", e))?;

    let item_id = result.last_insert_rowid();
    get_menu_item_by_id(item_id, db).await
}

#[tauri::command]
pub async fn get_menu_items_by_category(
    category_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuItem>>, String> {
    let items = sqlx::query_as(
        MenuItem,
        "SELECT * FROM menu_items WHERE category_id = ? ORDER BY sort_order, name",
        category_id
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| format!("Failed to fetch menu items: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some(items),
        message: None,
        error: None,
    })
}

#[tauri::command]
pub async fn get_menu_item_by_id(
    id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItem>, String> {
    let item = sqlx::query_as::<_, MenuItem>("SELECT * FROM menu_items WHERE id = ?", id)
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
    sqlx::query!("DELETE FROM menu_items WHERE id = ?", id)
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