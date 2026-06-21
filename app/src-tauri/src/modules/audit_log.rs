use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn create_audit_entry(
    pool: State<'_, SqlitePool>,
    entity_type: String, entity_id: i64, action: String,
    changes: Option<String>, performed_by: Option<String>,
) -> Result<serde_json::Value, String> {
    sqlx::query(
        "INSERT INTO audit_log (entity_type, entity_id, action, changes, performed_by) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&entity_type).bind(entity_id).bind(&action)
    .bind(&changes).bind(&performed_by)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_audit_log(
    pool: State<'_, SqlitePool>,
    entity_type: Option<String>, entity_id: Option<i64>, limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(50);
    let rows = if let (Some(et), Some(eid)) = (&entity_type, entity_id) {
        sqlx::query("SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ?")
            .bind(et).bind(eid).bind(limit)
            .fetch_all(pool.inner()).await
    } else if let Some(et) = &entity_type {
        sqlx::query("SELECT * FROM audit_log WHERE entity_type = ? ORDER BY created_at DESC LIMIT ?")
            .bind(et).bind(limit)
            .fetch_all(pool.inner()).await
    } else {
        sqlx::query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?")
            .bind(limit)
            .fetch_all(pool.inner()).await
    }.map_err(|e| e.to_string())?;

    let entries: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "entity_type": r.try_get::<String, _>("entity_type").unwrap_or_default(),
        "entity_id": r.try_get::<i64, _>("entity_id").unwrap_or(0),
        "action": r.try_get::<String, _>("action").unwrap_or_default(),
        "changes": r.try_get::<Option<String>, _>("changes").unwrap_or(None),
        "performed_by": r.try_get::<Option<String>, _>("performed_by").unwrap_or(None),
        "created_at": r.try_get::<String, _>("created_at").unwrap_or_default(),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": entries }))
}
