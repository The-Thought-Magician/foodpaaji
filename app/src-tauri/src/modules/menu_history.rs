use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn record_menu_change(
    pool: State<'_, SqlitePool>,
    menu_item_id: i64, field_name: String,
    old_value: Option<String>, new_value: Option<String>,
    changed_by: Option<String>,
) -> Result<serde_json::Value, String> {
    sqlx::query(
        "INSERT INTO menu_item_history (menu_item_id, field_name, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(menu_item_id).bind(&field_name)
    .bind(&old_value).bind(&new_value).bind(&changed_by)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_menu_item_history(
    pool: State<'_, SqlitePool>,
    menu_item_id: i64, limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(50);
    let rows = sqlx::query(
        "SELECT id, menu_item_id, field_name, old_value, new_value, changed_by, created_at FROM menu_item_history WHERE menu_item_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .bind(menu_item_id).bind(limit)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let entries: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "menu_item_id": r.try_get::<i64, _>("menu_item_id").unwrap_or(0),
        "field_name": r.try_get::<String, _>("field_name").unwrap_or_default(),
        "old_value": r.try_get::<Option<String>, _>("old_value").unwrap_or(None),
        "new_value": r.try_get::<Option<String>, _>("new_value").unwrap_or(None),
        "changed_by": r.try_get::<Option<String>, _>("changed_by").unwrap_or(None),
        "created_at": r.try_get::<String, _>("created_at").unwrap_or_default(),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": entries }))
}
