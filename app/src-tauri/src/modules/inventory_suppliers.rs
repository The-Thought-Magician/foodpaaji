use crate::database::DbPool;
use crate::types::{InventoryCategory, Supplier, CreateCategoryRequest, CreateSupplierRequest, ApiResponse};
use tauri::State;

#[tauri::command]
pub async fn get_inventory_categories(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<InventoryCategory>>, String> {
    match sqlx::query_as::<_, InventoryCategory>(
        "SELECT id, restaurant_id, name, description, parent_id, is_active,
         created_at, updated_at FROM inventory_categories
         WHERE restaurant_id = ? AND is_active = 1 ORDER BY name ASC"
    )
    .bind(restaurant_id).fetch_all(&*db).await
    {
        Ok(categories) => Ok(ApiResponse { success: true, data: Some(categories), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn create_inventory_category(
    request: CreateCategoryRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<InventoryCategory>, String> {
    match sqlx::query(
        "INSERT INTO inventory_categories (restaurant_id, name, description, parent_id) VALUES (?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(&request.name).bind(&request.description).bind(request.parent_id)
    .execute(&*db).await
    {
        Ok(result) => match get_category_by_id(result.last_insert_rowid(), &db).await {
            Ok(cat) => Ok(ApiResponse { success: true, data: Some(cat), message: Some("Category created successfully".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

async fn get_category_by_id(id: i64, db: &DbPool) -> Result<InventoryCategory, String> {
    sqlx::query_as::<_, InventoryCategory>(
        "SELECT id, restaurant_id, name, description, parent_id, is_active,
         created_at, updated_at FROM inventory_categories WHERE id = ?"
    )
    .bind(id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub async fn get_suppliers(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<Supplier>>, String> {
    match sqlx::query_as::<_, Supplier>(
        "SELECT id, restaurant_id, name, contact_person, email, phone, address,
         gstin, payment_terms, is_active, created_at, updated_at FROM suppliers
         WHERE restaurant_id = ? AND is_active = 1 ORDER BY name ASC"
    )
    .bind(restaurant_id).fetch_all(&*db).await
    {
        Ok(suppliers) => Ok(ApiResponse { success: true, data: Some(suppliers), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn create_supplier(
    request: CreateSupplierRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Supplier>, String> {
    match sqlx::query(
        "INSERT INTO suppliers (restaurant_id, name, contact_person, email, phone,
         address, gstin, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(&request.name).bind(&request.contact_person)
    .bind(&request.email).bind(&request.phone).bind(&request.address)
    .bind(&request.gstin).bind(&request.payment_terms)
    .execute(&*db).await
    {
        Ok(result) => match get_supplier_by_id(result.last_insert_rowid(), &db).await {
            Ok(sup) => Ok(ApiResponse { success: true, data: Some(sup), message: Some("Supplier created successfully".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn update_supplier(
    supplier_id: i64,
    request: CreateSupplierRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Supplier>, String> {
    match sqlx::query(
        "UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?,
         address = ?, gstin = ?, payment_terms = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(&request.name).bind(&request.contact_person).bind(&request.email).bind(&request.phone)
    .bind(&request.address).bind(&request.gstin).bind(&request.payment_terms).bind(supplier_id)
    .execute(&*db).await
    {
        Ok(_) => match get_supplier_by_id(supplier_id, &db).await {
            Ok(sup) => Ok(ApiResponse { success: true, data: Some(sup), message: Some("Supplier updated".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn delete_supplier(
    supplier_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query("UPDATE suppliers SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
        .bind(supplier_id).execute(&*db).await
    {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Supplier removed".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

async fn get_supplier_by_id(id: i64, db: &DbPool) -> Result<Supplier, String> {
    sqlx::query_as::<_, Supplier>(
        "SELECT id, restaurant_id, name, contact_person, email, phone, address,
         gstin, payment_terms, is_active, created_at, updated_at FROM suppliers WHERE id = ?"
    )
    .bind(id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}
