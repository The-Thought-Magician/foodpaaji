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

#[tauri::command]
pub async fn get_customer_profitability(
    pool: State<'_, SqlitePool>,
    days: Option<i64>,
) -> Result<serde_json::Value, String> {
    let days = days.unwrap_or(90);

    let rows = sqlx::query(
        "SELECT c.id, c.name, c.phone, c.loyalty_points,
           COUNT(DISTINCT o.id) as order_count,
           COALESCE(SUM(o.total_amount), 0) as revenue,
           COALESCE(AVG(o.total_amount), 0) as avg_order,
           COALESCE(MAX(o.created_at), '') as last_order,
           COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancellations,
           COALESCE(julianday('now') - julianday(MIN(o.created_at)), 0) as customer_age_days
         FROM customers c
         LEFT JOIN orders o ON c.id = o.customer_id AND o.created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY c.id
         HAVING order_count > 0
         ORDER BY revenue DESC LIMIT 50"
    )
    .bind(days)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let customers: Vec<serde_json::Value> = rows.iter().map(|r| {
        let revenue = r.try_get::<f64, _>("revenue").unwrap_or(0.0);
        let orders = r.try_get::<i64, _>("order_count").unwrap_or(0);
        let cancellations = r.try_get::<i64, _>("cancellations").unwrap_or(0);
        let age_days = r.try_get::<f64, _>("customer_age_days").unwrap_or(1.0).max(1.0);
        let frequency = (orders as f64) / (age_days / 30.0);
        let cancel_rate = if orders > 0 { (cancellations as f64 / orders as f64) * 100.0 } else { 0.0 };

        serde_json::json!({
            "id": r.try_get::<i64, _>("id").unwrap_or(0),
            "name": r.try_get::<String, _>("name").unwrap_or_default(),
            "phone": r.try_get::<Option<String>, _>("phone").unwrap_or(None),
            "loyalty_points": r.try_get::<i64, _>("loyalty_points").unwrap_or(0),
            "order_count": orders,
            "revenue": revenue,
            "avg_order": r.try_get::<f64, _>("avg_order").unwrap_or(0.0),
            "last_order": r.try_get::<String, _>("last_order").unwrap_or_default(),
            "cancellations": cancellations,
            "cancel_rate": (cancel_rate * 10.0).round() / 10.0,
            "monthly_frequency": (frequency * 10.0).round() / 10.0,
        })
    }).collect();

    let total_rev: f64 = customers.iter().map(|c| c["revenue"].as_f64().unwrap_or(0.0)).sum();
    let top_20_rev: f64 = customers.iter().take(customers.len() / 5 + 1).map(|c| c["revenue"].as_f64().unwrap_or(0.0)).sum();

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "customers": customers,
            "total_revenue": total_rev,
            "top_20_pct_revenue": if total_rev > 0.0 { (top_20_rev / total_rev * 100.0).round() } else { 0.0 },
        }
    }))
}
