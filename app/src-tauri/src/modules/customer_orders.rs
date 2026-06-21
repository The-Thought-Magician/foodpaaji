use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn get_customer_order_history(
    pool: State<'_, SqlitePool>,
    customer_id: i64, limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(50);

    let orders = sqlx::query(
        "SELECT o.id, o.order_type, o.status, o.total_amount, o.created_at,
           GROUP_CONCAT(mi.name || ' x' || oi.quantity, ', ') as items_summary
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE o.customer_id = ?
         GROUP BY o.id
         ORDER BY o.created_at DESC LIMIT ?"
    )
    .bind(customer_id).bind(limit)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let entries: Vec<serde_json::Value> = orders.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "order_type": r.try_get::<String, _>("order_type").unwrap_or_default(),
        "status": r.try_get::<String, _>("status").unwrap_or_default(),
        "total_amount": r.try_get::<f64, _>("total_amount").unwrap_or(0.0),
        "items_summary": r.try_get::<Option<String>, _>("items_summary").unwrap_or(None),
        "created_at": r.try_get::<String, _>("created_at").unwrap_or_default(),
    })).collect();

    let stats = sqlx::query(
        "SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as lifetime_spend,
           COALESCE(AVG(total_amount), 0) as avg_order_value
         FROM orders WHERE customer_id = ?"
    )
    .bind(customer_id)
    .fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "orders": entries,
            "total_orders": stats.try_get::<i64, _>("total_orders").unwrap_or(0),
            "lifetime_spend": stats.try_get::<f64, _>("lifetime_spend").unwrap_or(0.0),
            "avg_order_value": stats.try_get::<f64, _>("avg_order_value").unwrap_or(0.0),
        }
    }))
}
