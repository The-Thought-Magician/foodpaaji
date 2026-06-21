use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn get_seasonal_adjustments(
    pool: State<'_, SqlitePool>,
    inventory_item_id: Option<i64>,
) -> Result<serde_json::Value, String> {
    let rows = if let Some(id) = inventory_item_id {
        sqlx::query("SELECT sa.*, ii.name as item_name FROM seasonal_adjustments sa LEFT JOIN inventory_items ii ON sa.inventory_item_id = ii.id WHERE sa.inventory_item_id = ? ORDER BY sa.start_month")
            .bind(id).fetch_all(pool.inner()).await
    } else {
        sqlx::query("SELECT sa.*, ii.name as item_name FROM seasonal_adjustments sa LEFT JOIN inventory_items ii ON sa.inventory_item_id = ii.id ORDER BY sa.start_month")
            .fetch_all(pool.inner()).await
    }.map_err(|e| e.to_string())?;

    let entries: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "inventory_item_id": r.try_get::<i64, _>("inventory_item_id").unwrap_or(0),
        "item_name": r.try_get::<Option<String>, _>("item_name").unwrap_or(None),
        "season_name": r.try_get::<String, _>("season_name").unwrap_or_default(),
        "start_month": r.try_get::<i64, _>("start_month").unwrap_or(1),
        "end_month": r.try_get::<i64, _>("end_month").unwrap_or(12),
        "demand_multiplier": r.try_get::<f64, _>("demand_multiplier").unwrap_or(1.0),
        "reorder_point_override": r.try_get::<Option<f64>, _>("reorder_point_override").unwrap_or(None),
        "notes": r.try_get::<Option<String>, _>("notes").unwrap_or(None),
        "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": entries }))
}

#[tauri::command]
pub async fn create_seasonal_adjustment(
    pool: State<'_, SqlitePool>,
    inventory_item_id: i64, season_name: String,
    start_month: i64, end_month: i64, demand_multiplier: f64,
    reorder_point_override: Option<f64>, notes: Option<String>,
) -> Result<serde_json::Value, String> {
    sqlx::query(
        "INSERT INTO seasonal_adjustments (inventory_item_id, season_name, start_month, end_month, demand_multiplier, reorder_point_override, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(inventory_item_id).bind(&season_name)
    .bind(start_month).bind(end_month).bind(demand_multiplier)
    .bind(reorder_point_override).bind(&notes)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn delete_seasonal_adjustment(
    pool: State<'_, SqlitePool>, id: i64,
) -> Result<serde_json::Value, String> {
    sqlx::query("DELETE FROM seasonal_adjustments WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn toggle_seasonal_adjustment(
    pool: State<'_, SqlitePool>, id: i64,
) -> Result<serde_json::Value, String> {
    sqlx::query("UPDATE seasonal_adjustments SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}
