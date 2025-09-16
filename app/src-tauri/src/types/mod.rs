use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Restaurant {
    pub id: Option<i64>,
    pub name: String,
    pub slug: String,
    pub email: String,
    pub phone: String,
    pub address: String,
    pub settings: String,
    pub subscription_tier: String,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub email: String,
    pub phone: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub permissions: String,
    pub salary: Option<f64>,
    pub hire_date: Option<String>,
    pub is_active: bool,
    pub last_login: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub restaurant_id: i64,
    pub email: String,
    pub phone: Option<String>,
    pub password: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub salary: Option<f64>,
    pub hire_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum AppErrorKind {
    Database,
    Validation,
    NotFound,
    Unauthorized,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppError {
    pub kind: AppErrorKind,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryItem {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub category_id: Option<i64>,
    pub supplier_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub unit_type: String,
    pub base_unit: String,
    pub conversion_factor: f64,
    pub current_stock: f64,
    pub minimum_stock: f64,
    pub maximum_stock: f64,
    pub reorder_point: f64,
    pub cost_price: f64,
    pub selling_price: f64,
    pub tax_rate: f64,
    pub expiry_tracking: bool,
    pub batch_tracking: bool,
    pub location: Option<String>,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryCategory {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<i64>,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Supplier {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub name: String,
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub gstin: Option<String>,
    pub payment_terms: Option<String>,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInventoryItemRequest {
    pub restaurant_id: i64,
    pub category_id: Option<i64>,
    pub supplier_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub unit_type: String,
    pub base_unit: String,
    pub conversion_factor: Option<f64>,
    pub minimum_stock: Option<f64>,
    pub maximum_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub cost_price: Option<f64>,
    pub selling_price: Option<f64>,
    pub tax_rate: Option<f64>,
    pub expiry_tracking: Option<bool>,
    pub batch_tracking: Option<bool>,
    pub location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoryRequest {
    pub restaurant_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSupplierRequest {
    pub restaurant_id: i64,
    pub name: String,
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub gstin: Option<String>,
    pub payment_terms: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct StockMovement {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
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
    pub movement_date: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateStockMovementRequest {
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
    pub movement_type: String,
    pub quantity: f64,
    pub unit_cost: Option<f64>,
    pub reference_type: Option<String>,
    pub reference_id: Option<i64>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub notes: Option<String>,
    pub user_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct LowStockAlert {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub inventory_item_id: i64,
    pub alert_level: String,
    pub current_stock: f64,
    pub threshold_stock: f64,
    pub is_acknowledged: bool,
    pub acknowledged_by: Option<i64>,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UnitConversion {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub from_unit: String,
    pub to_unit: String,
    pub conversion_factor: f64,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUnitConversionRequest {
    pub restaurant_id: i64,
    pub from_unit: String,
    pub to_unit: String,
    pub conversion_factor: f64,
}