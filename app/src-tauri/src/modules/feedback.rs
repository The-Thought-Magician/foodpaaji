use sqlx::{SqlitePool, Row};
use tauri::State;

#[tauri::command]
pub async fn create_feedback(
    pool: State<'_, SqlitePool>,
    customer_id: i64,
    bill_id: Option<i64>,
    rating: i64,
    comment: Option<String>,
) -> Result<serde_json::Value, String> {
    if !(1..=5).contains(&rating) {
        return Err("Rating must be between 1 and 5".to_string());
    }
    let id = sqlx::query(
        "INSERT INTO customer_feedback (customer_id, bill_id, rating, comment) VALUES (?, ?, ?, ?)"
    )
    .bind(customer_id).bind(bill_id).bind(rating).bind(&comment)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?
    .last_insert_rowid();

    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
pub async fn get_customer_feedback(
    pool: State<'_, SqlitePool>,
    customer_id: i64,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT cf.id, cf.rating, cf.comment, cf.created_at, cf.bill_id, b.bill_number
         FROM customer_feedback cf
         LEFT JOIN bills b ON cf.bill_id = b.id
         WHERE cf.customer_id = ?
         ORDER BY cf.created_at DESC LIMIT 20"
    )
    .bind(customer_id)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let data: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "rating": r.try_get::<i64, _>("rating").unwrap_or(0),
        "comment": r.try_get::<Option<String>, _>("comment").unwrap_or(None),
        "created_at": r.try_get::<String, _>("created_at").unwrap_or_default(),
        "bill_id": r.try_get::<Option<i64>, _>("bill_id").unwrap_or(None),
        "bill_number": r.try_get::<Option<String>, _>("bill_number").unwrap_or(None),
    })).collect();

    let avg: f64 = if data.is_empty() { 0.0 } else {
        data.iter().map(|d| d["rating"].as_f64().unwrap_or(0.0)).sum::<f64>() / data.len() as f64
    };

    Ok(serde_json::json!({ "success": true, "data": data, "average_rating": avg }))
}

#[tauri::command]
pub async fn get_feedback_summary(pool: State<'_, SqlitePool>) -> Result<serde_json::Value, String> {
    let row = sqlx::query(
        "SELECT COUNT(*) as total, AVG(CAST(rating AS FLOAT)) as avg_rating,
         SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive,
         SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative
         FROM customer_feedback WHERE date(created_at) >= date('now', '-30 days')"
    )
    .fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true, "data": {
        "total": row.try_get::<i64, _>("total").unwrap_or(0),
        "average_rating": row.try_get::<f64, _>("avg_rating").unwrap_or(0.0),
        "positive": row.try_get::<i64, _>("positive").unwrap_or(0),
        "negative": row.try_get::<i64, _>("negative").unwrap_or(0),
    }}))
}
