use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn get_revenue_trends(
    pool: State<'_, SqlitePool>,
    days: Option<i64>,
) -> Result<serde_json::Value, String> {
    let days = days.unwrap_or(30);

    let daily = sqlx::query(
        "SELECT date(created_at) as day,
           COUNT(*) as bill_count,
           COALESCE(SUM(total_amount), 0) as revenue,
           COALESCE(SUM(tax_amount), 0) as tax,
           COALESCE(SUM(discount_amount), 0) as discount,
           COALESCE(AVG(total_amount), 0) as avg_bill
         FROM bills
         WHERE status != 'cancelled' AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY day ORDER BY day"
    )
    .bind(days)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let entries: Vec<serde_json::Value> = daily.iter().map(|r| serde_json::json!({
        "day": r.try_get::<String, _>("day").unwrap_or_default(),
        "bill_count": r.try_get::<i64, _>("bill_count").unwrap_or(0),
        "revenue": r.try_get::<f64, _>("revenue").unwrap_or(0.0),
        "tax": r.try_get::<f64, _>("tax").unwrap_or(0.0),
        "discount": r.try_get::<f64, _>("discount").unwrap_or(0.0),
        "avg_bill": r.try_get::<f64, _>("avg_bill").unwrap_or(0.0),
    })).collect();

    let total_rev: f64 = entries.iter().map(|e| e["revenue"].as_f64().unwrap_or(0.0)).sum();
    let total_bills: i64 = entries.iter().map(|e| e["bill_count"].as_i64().unwrap_or(0)).sum();
    let best_day = entries.iter().max_by(|a, b| a["revenue"].as_f64().unwrap_or(0.0).partial_cmp(&b["revenue"].as_f64().unwrap_or(0.0)).unwrap());

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "daily": entries,
            "total_revenue": total_rev,
            "total_bills": total_bills,
            "avg_daily_revenue": if !entries.is_empty() { total_rev / entries.len() as f64 } else { 0.0 },
            "best_day": best_day.map(|d| d["day"].as_str().unwrap_or("").to_string()),
            "best_day_revenue": best_day.map(|d| d["revenue"].as_f64().unwrap_or(0.0)).unwrap_or(0.0),
        }
    }))
}
