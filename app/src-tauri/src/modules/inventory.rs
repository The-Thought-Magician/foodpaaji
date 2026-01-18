use crate::database::DbPool;
use crate::types::{InventoryItem, InventoryCategory, Supplier, CreateInventoryItemRequest, CreateCategoryRequest, CreateSupplierRequest, ApiResponse};
use tauri::State;
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Deserialize)]
pub struct InventorySearchRequest {
    pub restaurant_id: i64,
    pub search: Option<String>,
    pub category_id: Option<i64>,
    pub supplier_id: Option<i64>,
    pub low_stock_only: Option<bool>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct InventorySearchResponse {
    pub items: Vec<InventoryItem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[tauri::command]
pub async fn get_inventory_items(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<InventoryItem>>, String> {
    match sqlx::query_as::<_, InventoryItem>(
        "SELECT id, restaurant_id, category_id, supplier_id, name, description, 
         sku, barcode, unit_type, base_unit, conversion_factor, current_stock, 
         minimum_stock, maximum_stock, reorder_point, cost_price, selling_price, 
         tax_rate, expiry_tracking, batch_tracking, location, is_active, 
         created_at, updated_at FROM inventory_items WHERE restaurant_id = ? 
         AND is_active = 1 ORDER BY name ASC"
    )
    .bind(restaurant_id)
    .fetch_all(&*db)
    .await
    {
        Ok(items) => Ok(ApiResponse {
            success: true,
            data: Some(items),
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

#[tauri::command]
pub async fn search_inventory_items(
    request: InventorySearchRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<InventorySearchResponse>, String> {
    let page = request.page.unwrap_or(1);
    let limit = request.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let mut query = "SELECT id, restaurant_id, category_id, supplier_id, name, description, 
                     sku, barcode, unit_type, base_unit, conversion_factor, current_stock, 
                     minimum_stock, maximum_stock, reorder_point, cost_price, selling_price, 
                     tax_rate, expiry_tracking, batch_tracking, location, is_active, 
                     created_at, updated_at FROM inventory_items WHERE restaurant_id = ? AND is_active = 1".to_string();
    
    let mut count_query = "SELECT COUNT(*) FROM inventory_items WHERE restaurant_id = ? AND is_active = 1".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(search) = &request.search {
        if !search.trim().is_empty() {
            query.push_str(" AND (name LIKE ? OR description LIKE ? OR sku LIKE ? OR barcode LIKE ?)");
            count_query.push_str(" AND (name LIKE ? OR description LIKE ? OR sku LIKE ? OR barcode LIKE ?)");
            let search_pattern = format!("%{}%", search.trim());
            params.extend(vec![
                search_pattern.clone(),
                search_pattern.clone(),
                search_pattern.clone(),
                search_pattern
            ]);
        }
    }

    if let Some(category_id) = request.category_id {
        query.push_str(" AND category_id = ?");
        count_query.push_str(" AND category_id = ?");
        params.push(category_id.to_string());
    }

    if let Some(supplier_id) = request.supplier_id {
        query.push_str(" AND supplier_id = ?");
        count_query.push_str(" AND supplier_id = ?");
        params.push(supplier_id.to_string());
    }

    if let Some(true) = request.low_stock_only {
        query.push_str(" AND current_stock <= reorder_point");
        count_query.push_str(" AND current_stock <= reorder_point");
    }

    query.push_str(" ORDER BY name ASC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let total_result = sqlx::query_scalar::<_, i64>(&count_query);
    let mut total_query = total_result;
    for (i, param) in params.iter().take(params.len() - 2).enumerate() {
        total_query = total_query.bind(param);
    }

    let items_result = sqlx::query_as::<_, InventoryItem>(&query);
    let mut items_query = items_result;
    for param in &params {
        items_query = items_query.bind(param);
    }

    match tokio::try_join!(
        total_query.fetch_one(&*db),
        items_query.fetch_all(&*db)
    ) {
        Ok((total, items)) => Ok(ApiResponse {
            success: true,
            data: Some(InventorySearchResponse {
                items,
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

#[tauri::command]
pub async fn create_inventory_item(
    request: CreateInventoryItemRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<InventoryItem>, String> {
    match sqlx::query(
        "INSERT INTO inventory_items (restaurant_id, category_id, supplier_id, name,
         description, sku, barcode, unit_type, base_unit, conversion_factor,
         minimum_stock, maximum_stock, reorder_point, cost_price, selling_price,
         tax_rate, expiry_tracking, batch_tracking, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(request.category_id)
    .bind(request.supplier_id)
    .bind(&request.name)
    .bind(&request.description)
    .bind(&request.sku)
    .bind(&request.barcode)
    .bind(&request.unit_type)
    .bind(&request.base_unit)
    .bind(request.conversion_factor.unwrap_or(1.0))
    .bind(request.minimum_stock.unwrap_or(0.0))
    .bind(request.maximum_stock.unwrap_or(0.0))
    .bind(request.reorder_point.unwrap_or(0.0))
    .bind(request.cost_price.unwrap_or(0.0))
    .bind(request.selling_price.unwrap_or(0.0))
    .bind(request.tax_rate.unwrap_or(0.0))
    .bind(request.expiry_tracking.unwrap_or(false))
    .bind(request.batch_tracking.unwrap_or(false))
    .bind(&request.location)
    .execute(&*db)
    .await
    {
        Ok(result) => {
            let item_id = result.last_insert_rowid();
            match get_inventory_item_by_id(item_id, &db).await {
                Ok(item) => Ok(ApiResponse {
                    success: true,
                    data: Some(item),
                    message: Some("Inventory item created successfully".to_string()),
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

async fn get_inventory_item_by_id(id: i64, db: &DbPool) -> Result<InventoryItem, String> {
    sqlx::query_as::<_, InventoryItem>(
        "SELECT id, restaurant_id, category_id, supplier_id, name, description, 
         sku, barcode, unit_type, base_unit, conversion_factor, current_stock, 
         minimum_stock, maximum_stock, reorder_point, cost_price, selling_price, 
         tax_rate, expiry_tracking, batch_tracking, location, is_active, 
         created_at, updated_at FROM inventory_items WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub async fn get_inventory_categories(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<InventoryCategory>>, String> {
    match sqlx::query_as::<_, InventoryCategory>(
        "SELECT id, restaurant_id, name, description, parent_id, is_active, 
         created_at, updated_at FROM inventory_categories WHERE restaurant_id = ? 
         AND is_active = 1 ORDER BY name ASC"
    )
    .bind(restaurant_id)
    .fetch_all(&*db)
    .await
    {
        Ok(categories) => Ok(ApiResponse {
            success: true,
            data: Some(categories),
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

#[tauri::command]
pub async fn create_inventory_category(
    request: CreateCategoryRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<InventoryCategory>, String> {
    match sqlx::query(
        "INSERT INTO inventory_categories (restaurant_id, name, description, parent_id)
         VALUES (?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(&request.name)
    .bind(&request.description)
    .bind(request.parent_id)
    .execute(&*db)
    .await
    {
        Ok(result) => {
            let category_id = result.last_insert_rowid();
            match get_category_by_id(category_id, &db).await {
                Ok(category) => Ok(ApiResponse {
                    success: true,
                    data: Some(category),
                    message: Some("Category created successfully".to_string()),
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

async fn get_category_by_id(id: i64, db: &DbPool) -> Result<InventoryCategory, String> {
    sqlx::query_as::<_, InventoryCategory>(
        "SELECT id, restaurant_id, name, description, parent_id, is_active, 
         created_at, updated_at FROM inventory_categories WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
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
    .bind(restaurant_id)
    .fetch_all(&*db)
    .await
    {
        Ok(suppliers) => Ok(ApiResponse {
            success: true,
            data: Some(suppliers),
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

#[tauri::command]
pub async fn create_supplier(
    request: CreateSupplierRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Supplier>, String> {
    match sqlx::query(
        "INSERT INTO suppliers (restaurant_id, name, contact_person, email, phone,
         address, gstin, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(&request.name)
    .bind(&request.contact_person)
    .bind(&request.email)
    .bind(&request.phone)
    .bind(&request.address)
    .bind(&request.gstin)
    .bind(&request.payment_terms)
    .execute(&*db)
    .await
    {
        Ok(result) => {
            let supplier_id = result.last_insert_rowid();
            match get_supplier_by_id(supplier_id, &db).await {
                Ok(supplier) => Ok(ApiResponse {
                    success: true,
                    data: Some(supplier),
                    message: Some("Supplier created successfully".to_string()),
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

async fn get_supplier_by_id(id: i64, db: &DbPool) -> Result<Supplier, String> {
    sqlx::query_as::<_, Supplier>(
        "SELECT id, restaurant_id, name, contact_person, email, phone, address, 
         gstin, payment_terms, is_active, created_at, updated_at FROM suppliers WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}