use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn get_menu_performance(
    pool: State<'_, SqlitePool>,
    days: Option<i64>,
) -> Result<serde_json::Value, String> {
    let days = days.unwrap_or(30);

    let rows = sqlx::query(
        "SELECT mi.id, mi.name, mc.name as category, mi.price, mi.cost_price,
           COUNT(oi.id) as times_ordered,
           COALESCE(SUM(oi.quantity), 0) as total_qty,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue
         FROM menu_items mi
         LEFT JOIN menu_categories mc ON mi.category_id = mc.id
         LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
         LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY mi.id
         ORDER BY total_revenue DESC"
    )
    .bind(days)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let items: Vec<serde_json::Value> = rows.iter().map(|r| {
        let price = r.try_get::<f64, _>("price").unwrap_or(0.0);
        let cost = r.try_get::<Option<f64>, _>("cost_price").unwrap_or(None).unwrap_or(0.0);
        let revenue = r.try_get::<f64, _>("total_revenue").unwrap_or(0.0);
        let qty = r.try_get::<i64, _>("total_qty").unwrap_or(0);
        let margin = if price > 0.0 { ((price - cost) / price * 100.0).round() } else { 0.0 };
        let profit = (price - cost) * qty as f64;

        serde_json::json!({
            "id": r.try_get::<i64, _>("id").unwrap_or(0),
            "name": r.try_get::<String, _>("name").unwrap_or_default(),
            "category": r.try_get::<Option<String>, _>("category").unwrap_or(None),
            "price": price,
            "cost_price": cost,
            "margin_pct": margin,
            "times_ordered": r.try_get::<i64, _>("times_ordered").unwrap_or(0),
            "total_qty": qty,
            "total_revenue": revenue,
            "estimated_profit": (profit * 100.0).round() / 100.0,
        })
    }).collect();

    let total_rev: f64 = items.iter().map(|i| i["total_revenue"].as_f64().unwrap_or(0.0)).sum();
    let total_profit: f64 = items.iter().map(|i| i["estimated_profit"].as_f64().unwrap_or(0.0)).sum();

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "items": items,
            "total_revenue": total_rev,
            "total_estimated_profit": (total_profit * 100.0).round() / 100.0,
            "total_items": items.len(),
        }
    }))
}
