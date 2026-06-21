use sqlx::{SqlitePool, Row};
use tauri::State;

#[tauri::command]
pub async fn get_translations(
    pool: State<'_, SqlitePool>,
    locale: String,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT key, value FROM translations WHERE locale = ?"
    )
    .bind(&locale)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let mut map = serde_json::Map::new();
    for r in &rows {
        let key: String = r.try_get("key").unwrap_or_default();
        let value: String = r.try_get("value").unwrap_or_default();
        map.insert(key, serde_json::Value::String(value));
    }

    Ok(serde_json::json!({ "success": true, "data": map }))
}

#[tauri::command]
pub async fn upsert_translation(
    pool: State<'_, SqlitePool>,
    locale: String,
    key: String,
    value: String,
) -> Result<serde_json::Value, String> {
    sqlx::query(
        "INSERT INTO translations (locale, key, value) VALUES (?, ?, ?) ON CONFLICT(locale, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(&locale).bind(&key).bind(&value)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn bulk_upsert_translations(
    pool: State<'_, SqlitePool>,
    locale: String,
    entries: Vec<(String, String)>,
) -> Result<serde_json::Value, String> {
    for (key, value) in &entries {
        sqlx::query(
            "INSERT INTO translations (locale, key, value) VALUES (?, ?, ?) ON CONFLICT(locale, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
        )
        .bind(&locale).bind(key).bind(value)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({ "success": true, "count": entries.len() }))
}

#[tauri::command]
pub async fn get_available_locales(
    pool: State<'_, SqlitePool>,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT DISTINCT locale, COUNT(*) as key_count FROM translations GROUP BY locale ORDER BY locale"
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let data: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "locale": r.try_get::<String, _>("locale").unwrap_or_default(),
        "key_count": r.try_get::<i64, _>("key_count").unwrap_or(0),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": data }))
}

#[tauri::command]
pub async fn delete_translation(
    pool: State<'_, SqlitePool>,
    locale: String,
    key: String,
) -> Result<serde_json::Value, String> {
    sqlx::query("DELETE FROM translations WHERE locale = ? AND key = ?")
        .bind(&locale).bind(&key)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}
