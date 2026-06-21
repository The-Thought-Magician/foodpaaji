use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;
use chrono::Datelike;

#[tauri::command]
pub async fn get_scheduled_promotions(
    pool: State<'_, SqlitePool>,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query("SELECT * FROM scheduled_promotions ORDER BY start_time")
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let promos: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "name": r.try_get::<String, _>("name").unwrap_or_default(),
        "description": r.try_get::<Option<String>, _>("description").unwrap_or(None),
        "discount_type": r.try_get::<String, _>("discount_type").unwrap_or_default(),
        "discount_value": r.try_get::<f64, _>("discount_value").unwrap_or(0.0),
        "start_time": r.try_get::<String, _>("start_time").unwrap_or_default(),
        "end_time": r.try_get::<String, _>("end_time").unwrap_or_default(),
        "days_of_week": r.try_get::<String, _>("days_of_week").unwrap_or_default(),
        "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": promos }))
}

#[tauri::command]
pub async fn create_scheduled_promotion(
    pool: State<'_, SqlitePool>,
    name: String, description: Option<String>,
    discount_type: String, discount_value: f64,
    start_time: String, end_time: String, days_of_week: String,
) -> Result<serde_json::Value, String> {
    sqlx::query(
        "INSERT INTO scheduled_promotions (name, description, discount_type, discount_value, start_time, end_time, days_of_week) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&name).bind(&description).bind(&discount_type).bind(discount_value)
    .bind(&start_time).bind(&end_time).bind(&days_of_week)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn toggle_scheduled_promotion(
    pool: State<'_, SqlitePool>, id: i64,
) -> Result<serde_json::Value, String> {
    sqlx::query("UPDATE scheduled_promotions SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn delete_scheduled_promotion(
    pool: State<'_, SqlitePool>, id: i64,
) -> Result<serde_json::Value, String> {
    sqlx::query("DELETE FROM scheduled_promotions WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_active_promotions_now(
    pool: State<'_, SqlitePool>,
) -> Result<serde_json::Value, String> {
    let now = chrono::Local::now();
    let time = now.format("%H:%M").to_string();
    let dow = now.weekday().num_days_from_sunday().to_string();

    let rows = sqlx::query(
        "SELECT * FROM scheduled_promotions WHERE is_active = 1 AND start_time <= ? AND end_time >= ? AND days_of_week LIKE '%' || ? || '%'"
    )
    .bind(&time).bind(&time).bind(&dow)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let active: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "name": r.try_get::<String, _>("name").unwrap_or_default(),
        "discount_type": r.try_get::<String, _>("discount_type").unwrap_or_default(),
        "discount_value": r.try_get::<f64, _>("discount_value").unwrap_or(0.0),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": active }))
}
