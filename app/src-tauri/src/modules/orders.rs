use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use tauri::State;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderItemRequest {
    pub menu_item_id: Option<i64>,
    pub item_name: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub customer_id: Option<i64>,
    pub table_number: Option<String>,
    pub items: Vec<OrderItemRequest>,
    pub notes: Option<String>,
}

fn generate_order_number() -> String {
    let now = Local::now();
    format!("ORD-{}", now.format("%Y%m%d%H%M%S"))
}

#[tauri::command]
pub async fn create_order(pool: State<'_, SqlitePool>, request: CreateOrderRequest) -> Result<serde_json::Value, String> {
    let order_number = generate_order_number();
    let order_id = sqlx::query!(
        "INSERT INTO orders (order_number, customer_id, table_number, notes) VALUES (?, ?, ?, ?)",
        order_number, request.customer_id, request.table_number, request.notes
    )
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    for item in &request.items {
        sqlx::query!(
            "INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?, ?)",
            order_id, item.menu_item_id, item.item_name, item.quantity, item.unit_price, item.notes
        )
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({ "success": true, "order_id": order_id, "order_number": order_number }))
}

#[tauri::command]
pub async fn get_orders(pool: State<'_, SqlitePool>, status: Option<String>, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(50);
    let rows = if let Some(s) = status {
        sqlx::query!(
            "SELECT id, order_number, customer_id, table_number, status, notes, created_at FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?",
            s, limit
        )
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
        .into_iter().map(|r| serde_json::json!({
            "id": r.id, "order_number": r.order_number, "customer_id": r.customer_id,
            "table_number": r.table_number, "status": r.status, "notes": r.notes, "created_at": r.created_at
        })).collect::<Vec<_>>()
    } else {
        sqlx::query!(
            "SELECT id, order_number, customer_id, table_number, status, notes, created_at FROM orders ORDER BY created_at DESC LIMIT ?",
            limit
        )
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
        .into_iter().map(|r| serde_json::json!({
            "id": r.id, "order_number": r.order_number, "customer_id": r.customer_id,
            "table_number": r.table_number, "status": r.status, "notes": r.notes, "created_at": r.created_at
        })).collect::<Vec<_>>()
    };
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

#[tauri::command]
pub async fn get_order_details(pool: State<'_, SqlitePool>, order_id: i64) -> Result<serde_json::Value, String> {
    let order = sqlx::query!(
        "SELECT id, order_number, customer_id, table_number, status, notes, created_at FROM orders WHERE id = ?",
        order_id
    )
    .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let Some(order) = order else {
        return Err("Order not found".to_string());
    };

    let items = sqlx::query!(
        "SELECT id, menu_item_id, item_name, quantity, unit_price, notes FROM order_items WHERE order_id = ?",
        order_id
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({
        "id": r.id, "menu_item_id": r.menu_item_id, "item_name": r.item_name,
        "quantity": r.quantity, "unit_price": r.unit_price, "notes": r.notes
    })).collect::<Vec<_>>();

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "id": order.id, "order_number": order.order_number, "customer_id": order.customer_id,
            "table_number": order.table_number, "status": order.status, "notes": order.notes,
            "created_at": order.created_at, "items": items
        }
    }))
}

#[tauri::command]
pub async fn update_order_status(pool: State<'_, SqlitePool>, order_id: i64, status: String) -> Result<serde_json::Value, String> {
    let sql = match status.as_str() {
        "preparing" => "UPDATE orders SET status = ?, started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        "ready" => "UPDATE orders SET status = ?, ready_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        _ => "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
    };
    sqlx::query(sql).bind(&status).bind(order_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn convert_order_to_bill(
    pool: State<'_, SqlitePool>,
    order_id: i64,
    discount_percent: f64,
    tax_percent: f64,
) -> Result<serde_json::Value, String> {
    let order_row = sqlx::query("SELECT customer_id, table_number, notes FROM orders WHERE id = ?")
        .bind(order_id).fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;
    let Some(order_row) = order_row else { return Err("Order not found".to_string()); };
    let order_customer_id: Option<i64> = order_row.try_get("customer_id").ok();
    let order_table: Option<String> = order_row.try_get("table_number").ok().flatten();
    let order_notes: Option<String> = order_row.try_get("notes").ok().flatten();

    let items = sqlx::query!(
        "SELECT item_name, quantity, unit_price, menu_item_id FROM order_items WHERE order_id = ?",
        order_id
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let subtotal: f64 = items.iter().map(|i| i.unit_price * i.quantity as f64).sum();
    let discount_amount = subtotal * discount_percent / 100.0;
    let taxable = subtotal - discount_amount;
    let tax_amount = taxable * tax_percent / 100.0;
    let total_amount = taxable + tax_amount;

    let now = Local::now();
    let bill_number = format!("BILL-{}", now.format("%Y%m%d%H%M%S"));

    let bill_id = sqlx::query!(
        "INSERT INTO bills (bill_number, customer_id, table_number, subtotal, discount_amount, discount_percent, tax_amount, tax_percent, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        bill_number, order_customer_id, order_table, subtotal, discount_amount, discount_percent, tax_amount, tax_percent, total_amount, order_notes
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?
    .last_insert_rowid();

    for item in &items {
        let total_price = item.unit_price * item.quantity as f64;
        sqlx::query!(
            "INSERT INTO bill_items (bill_id, menu_item_id, item_name, quantity, unit_price, discount_amount, total_price) VALUES (?, ?, ?, ?, ?, 0, ?)",
            bill_id, item.menu_item_id, item.item_name, item.quantity, item.unit_price, total_price
        )
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    }

    sqlx::query!(
        "UPDATE orders SET status = 'served', updated_at = datetime('now') WHERE id = ?",
        order_id
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "success": true, "bill_id": bill_id, "bill_number": bill_number, "total_amount": total_amount
    }))
}

#[tauri::command]
pub async fn get_kitchen_stats(pool: State<'_, SqlitePool>) -> Result<serde_json::Value, String> {
    let row = sqlx::query(
        "SELECT
           COUNT(*) as total_today,
           SUM(CASE WHEN status IN ('ready','served') AND started_at IS NOT NULL AND ready_at IS NOT NULL
               THEN (JULIANDAY(ready_at) - JULIANDAY(started_at)) * 1440 ELSE NULL END) as total_prep_min,
           COUNT(CASE WHEN status IN ('ready','served') AND started_at IS NOT NULL AND ready_at IS NOT NULL
               THEN 1 END) as completed_with_times,
           AVG(CASE WHEN status IN ('ready','served') AND started_at IS NOT NULL AND ready_at IS NOT NULL
               THEN (JULIANDAY(ready_at) - JULIANDAY(started_at)) * 1440 END) as avg_prep_min,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
           COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_count
         FROM orders WHERE date(created_at) = date('now')"
    )
    .fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;

    let data = serde_json::json!({
        "total_today": row.try_get::<i64, _>("total_today").unwrap_or(0),
        "avg_prep_min": row.try_get::<f64, _>("avg_prep_min").unwrap_or(0.0),
        "completed_with_times": row.try_get::<i64, _>("completed_with_times").unwrap_or(0),
        "pending_count": row.try_get::<i64, _>("pending_count").unwrap_or(0),
        "preparing_count": row.try_get::<i64, _>("preparing_count").unwrap_or(0),
    });
    Ok(serde_json::json!({ "success": true, "data": data }))
}
