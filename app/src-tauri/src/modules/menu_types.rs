use serde::{Deserialize, Serialize};

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

pub fn generate_slug(name: &str) -> String {
    name.to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect()
}
