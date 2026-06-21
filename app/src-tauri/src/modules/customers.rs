use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
}

#[tauri::command]
pub async fn create_customer(pool: State<'_, SqlitePool>, request: CreateCustomerRequest) -> Result<serde_json::Value, String> {
    let id = sqlx::query!(
        "INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)",
        request.name, request.phone, request.email, request.address
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?
    .last_insert_rowid();
    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
pub async fn get_customers(pool: State<'_, SqlitePool>, search: Option<String>, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(50);
    let rows = if let Some(q) = search {
        let pattern = format!("%{}%", q);
        sqlx::query!("SELECT id, name, phone, email, address, loyalty_points, total_spent, visit_count, is_active, created_at FROM customers WHERE (name LIKE ? OR phone LIKE ?) AND is_active = 1 ORDER BY name LIMIT ?", pattern, pattern, limit)
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "name": r.name, "phone": r.phone, "email": r.email, "loyalty_points": r.loyalty_points, "total_spent": r.total_spent, "visit_count": r.visit_count })).collect::<Vec<_>>()
    } else {
        sqlx::query!("SELECT id, name, phone, email, address, loyalty_points, total_spent, visit_count, is_active, created_at FROM customers WHERE is_active = 1 ORDER BY name LIMIT ?", limit)
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "name": r.name, "phone": r.phone, "email": r.email, "loyalty_points": r.loyalty_points, "total_spent": r.total_spent, "visit_count": r.visit_count })).collect::<Vec<_>>()
    };
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

#[tauri::command]
pub async fn get_customer(pool: State<'_, SqlitePool>, customer_id: i64) -> Result<serde_json::Value, String> {
    let row = sqlx::query("SELECT id, name, phone, email, address, notes, loyalty_points, total_spent, visit_count, created_at FROM customers WHERE id = ?")
        .bind(customer_id).fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;
    match row {
        None => Err("Customer not found".to_string()),
        Some(r) => {
            use sqlx::Row;
            Ok(serde_json::json!({ "success": true, "data": {
                "id": r.try_get::<i64,_>("id").unwrap_or(0),
                "name": r.try_get::<String,_>("name").unwrap_or_default(),
                "phone": r.try_get::<Option<String>,_>("phone").unwrap_or(None),
                "email": r.try_get::<Option<String>,_>("email").unwrap_or(None),
                "address": r.try_get::<Option<String>,_>("address").unwrap_or(None),
                "notes": r.try_get::<Option<String>,_>("notes").unwrap_or(None),
                "loyalty_points": r.try_get::<i64,_>("loyalty_points").unwrap_or(0),
                "total_spent": r.try_get::<f64,_>("total_spent").unwrap_or(0.0),
                "visit_count": r.try_get::<i64,_>("visit_count").unwrap_or(0),
                "created_at": r.try_get::<String,_>("created_at").unwrap_or_default()
            }}))
        }
    }
}

#[tauri::command]
pub async fn update_customer(pool: State<'_, SqlitePool>, customer_id: i64, name: String, phone: Option<String>, email: Option<String>, address: Option<String>, notes: Option<String>) -> Result<serde_json::Value, String> {
    sqlx::query("UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(&name).bind(&phone).bind(&email).bind(&address).bind(&notes).bind(customer_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn delete_customer(pool: State<'_, SqlitePool>, customer_id: i64) -> Result<serde_json::Value, String> {
    sqlx::query!("UPDATE customers SET is_active = 0, updated_at = datetime('now') WHERE id = ?", customer_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn add_loyalty_points(pool: State<'_, SqlitePool>, customer_id: i64, points: i64, bill_amount: f64) -> Result<serde_json::Value, String> {
    sqlx::query!(
        "UPDATE customers SET loyalty_points = loyalty_points + ?, total_spent = total_spent + ?, visit_count = visit_count + 1, updated_at = datetime('now') WHERE id = ?",
        points, bill_amount, customer_id
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    let row = sqlx::query!("SELECT loyalty_points FROM customers WHERE id = ?", customer_id)
        .fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true, "loyalty_points": row.loyalty_points }))
}

#[tauri::command]
pub async fn redeem_loyalty_points(pool: State<'_, SqlitePool>, customer_id: i64, points: i64) -> Result<serde_json::Value, String> {
    let row = sqlx::query!("SELECT loyalty_points FROM customers WHERE id = ?", customer_id)
        .fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;
    if row.loyalty_points < points {
        return Err("Insufficient loyalty points".to_string());
    }
    sqlx::query!("UPDATE customers SET loyalty_points = loyalty_points - ?, updated_at = datetime('now') WHERE id = ?", points, customer_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true, "remaining_points": row.loyalty_points - points }))
}

#[tauri::command]
pub async fn get_customer_stats(pool: State<'_, SqlitePool>) -> Result<serde_json::Value, String> {
    let stats = sqlx::query!(
        "SELECT COUNT(*) as total, COALESCE(SUM(total_spent), 0.0) as revenue, COALESCE(AVG(total_spent), 0.0) as avg_spend, COALESCE(SUM(loyalty_points), 0) as total_points FROM customers WHERE is_active = 1"
    ).fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true, "data": { "total_customers": stats.total, "total_revenue": stats.revenue, "avg_spend": stats.avg_spend, "total_loyalty_points": stats.total_points } }))
}
