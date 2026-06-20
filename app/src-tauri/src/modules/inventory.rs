use crate::database::DbPool;
use crate::types::{InventoryItem, CreateInventoryItemRequest, ApiResponse};
use tauri::State;
use serde::{Deserialize, Serialize};

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

const ITEM_SELECT: &str = "SELECT id, restaurant_id, category_id, supplier_id, name, description, \
    sku, barcode, unit_type, base_unit, conversion_factor, current_stock, \
    minimum_stock, maximum_stock, reorder_point, cost_price, selling_price, \
    tax_rate, expiry_tracking, batch_tracking, location, is_active, \
    created_at, updated_at FROM inventory_items";

#[tauri::command]
pub async fn get_inventory_items(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<InventoryItem>>, String> {
    match sqlx::query_as::<_, InventoryItem>(&format!("{} WHERE restaurant_id = ? AND is_active = 1 ORDER BY name ASC", ITEM_SELECT))
        .bind(restaurant_id).fetch_all(&*db).await
    {
        Ok(items) => Ok(ApiResponse { success: true, data: Some(items), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
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

    let mut query = format!("{} WHERE restaurant_id = ? AND is_active = 1", ITEM_SELECT);
    let mut count_query = "SELECT COUNT(*) FROM inventory_items WHERE restaurant_id = ? AND is_active = 1".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(search) = &request.search {
        if !search.trim().is_empty() {
            let clause = " AND (name LIKE ? OR description LIKE ? OR sku LIKE ? OR barcode LIKE ?)";
            query.push_str(clause);
            count_query.push_str(clause);
            let p = format!("%{}%", search.trim());
            params.extend(vec![p.clone(), p.clone(), p.clone(), p]);
        }
    }
    if let Some(cat_id) = request.category_id {
        query.push_str(" AND category_id = ?");
        count_query.push_str(" AND category_id = ?");
        params.push(cat_id.to_string());
    }
    if let Some(sup_id) = request.supplier_id {
        query.push_str(" AND supplier_id = ?");
        count_query.push_str(" AND supplier_id = ?");
        params.push(sup_id.to_string());
    }
    if let Some(true) = request.low_stock_only {
        query.push_str(" AND current_stock <= reorder_point");
        count_query.push_str(" AND current_stock <= reorder_point");
    }
    query.push_str(" ORDER BY name ASC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let mut total_query = sqlx::query_scalar::<_, i64>(&count_query);
    for param in params.iter().take(params.len() - 2) { total_query = total_query.bind(param); }
    let mut items_query = sqlx::query_as::<_, InventoryItem>(&query);
    for param in &params { items_query = items_query.bind(param); }

    match tokio::try_join!(total_query.fetch_one(&*db), items_query.fetch_all(&*db)) {
        Ok((total, items)) => Ok(ApiResponse { success: true, data: Some(InventorySearchResponse { items, total, page, limit }), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
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
    .bind(request.restaurant_id).bind(request.category_id).bind(request.supplier_id)
    .bind(&request.name).bind(&request.description).bind(&request.sku).bind(&request.barcode)
    .bind(&request.unit_type).bind(&request.base_unit).bind(request.conversion_factor.unwrap_or(1.0))
    .bind(request.minimum_stock.unwrap_or(0.0)).bind(request.maximum_stock.unwrap_or(0.0))
    .bind(request.reorder_point.unwrap_or(0.0)).bind(request.cost_price.unwrap_or(0.0))
    .bind(request.selling_price.unwrap_or(0.0)).bind(request.tax_rate.unwrap_or(0.0))
    .bind(request.expiry_tracking.unwrap_or(false)).bind(request.batch_tracking.unwrap_or(false))
    .bind(&request.location)
    .execute(&*db).await
    {
        Ok(result) => match get_inventory_item_by_id(result.last_insert_rowid(), &db).await {
            Ok(item) => Ok(ApiResponse { success: true, data: Some(item), message: Some("Inventory item created successfully".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

pub async fn get_inventory_item_by_id(id: i64, db: &DbPool) -> Result<InventoryItem, String> {
    sqlx::query_as::<_, InventoryItem>(&format!("{} WHERE id = ?", ITEM_SELECT))
        .bind(id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}

#[derive(Deserialize)]
pub struct BulkUpdateRequest {
    pub restaurant_id: i64,
    pub item_ids: Vec<i64>,
    pub operation_type: String,
    pub field: Option<String>,
    pub value: Option<f64>,
    pub percentage: Option<f64>,
}

#[tauri::command]
pub async fn bulk_update_inventory_items(
    request: BulkUpdateRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<i64>, String> {
    let mut updated = 0i64;
    for item_id in &request.item_ids {
        let sql = match (request.operation_type.as_str(), request.field.as_deref()) {
            ("PRICE_UPDATE", Some("cost_price")) =>
                format!("UPDATE inventory_items SET cost_price = {}, updated_at = CURRENT_TIMESTAMP WHERE id = {} AND restaurant_id = {}", request.value.unwrap_or(0.0), item_id, request.restaurant_id),
            ("PRICE_UPDATE", Some("selling_price")) =>
                format!("UPDATE inventory_items SET selling_price = {}, updated_at = CURRENT_TIMESTAMP WHERE id = {} AND restaurant_id = {}", request.value.unwrap_or(0.0), item_id, request.restaurant_id),
            ("STOCK_ADJUSTMENT", _) =>
                format!("UPDATE inventory_items SET current_stock = current_stock + {}, updated_at = CURRENT_TIMESTAMP WHERE id = {} AND restaurant_id = {}", request.value.unwrap_or(0.0), item_id, request.restaurant_id),
            ("REORDER_LEVELS", Some(field @ ("minimum_stock" | "maximum_stock" | "reorder_point"))) =>
                format!("UPDATE inventory_items SET {} = {}, updated_at = CURRENT_TIMESTAMP WHERE id = {} AND restaurant_id = {}", field, request.value.unwrap_or(0.0), item_id, request.restaurant_id),
            ("PERCENTAGE_MARKUP", Some("cost_price")) =>
                format!("UPDATE inventory_items SET cost_price = cost_price * {}, updated_at = CURRENT_TIMESTAMP WHERE id = {} AND restaurant_id = {}", 1.0 + request.percentage.unwrap_or(0.0) / 100.0, item_id, request.restaurant_id),
            ("PERCENTAGE_MARKUP", Some("selling_price")) =>
                format!("UPDATE inventory_items SET selling_price = selling_price * {}, updated_at = CURRENT_TIMESTAMP WHERE id = {} AND restaurant_id = {}", 1.0 + request.percentage.unwrap_or(0.0) / 100.0, item_id, request.restaurant_id),
            _ => continue,
        };
        if sqlx::query(&sql).execute(&*db).await.is_ok() { updated += 1; }
    }
    Ok(ApiResponse { success: true, data: Some(updated), message: Some(format!("{} items updated", updated)), error: None })
}
