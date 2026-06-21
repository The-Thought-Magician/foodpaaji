use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn get_customer_addresses(
    pool: State<'_, SqlitePool>, customer_id: i64,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT id, customer_id, label, address_line, locality, city, pincode, landmark, is_default FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC"
    ).bind(customer_id).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let addrs: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "customer_id": r.try_get::<i64, _>("customer_id").unwrap_or(0),
        "label": r.try_get::<String, _>("label").unwrap_or_default(),
        "address_line": r.try_get::<String, _>("address_line").unwrap_or_default(),
        "locality": r.try_get::<Option<String>, _>("locality").unwrap_or(None),
        "city": r.try_get::<Option<String>, _>("city").unwrap_or(None),
        "pincode": r.try_get::<Option<String>, _>("pincode").unwrap_or(None),
        "landmark": r.try_get::<Option<String>, _>("landmark").unwrap_or(None),
        "is_default": r.try_get::<bool, _>("is_default").unwrap_or(false),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": addrs }))
}

#[tauri::command]
pub async fn add_customer_address(
    pool: State<'_, SqlitePool>,
    customer_id: i64, label: String, address_line: String,
    locality: Option<String>, city: Option<String>,
    pincode: Option<String>, landmark: Option<String>, is_default: Option<bool>,
) -> Result<serde_json::Value, String> {
    if is_default.unwrap_or(false) {
        sqlx::query("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?")
            .bind(customer_id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    }
    sqlx::query(
        "INSERT INTO customer_addresses (customer_id, label, address_line, locality, city, pincode, landmark, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(customer_id).bind(&label).bind(&address_line)
    .bind(&locality).bind(&city).bind(&pincode).bind(&landmark)
    .bind(is_default.unwrap_or(false))
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn delete_customer_address(
    pool: State<'_, SqlitePool>, id: i64,
) -> Result<serde_json::Value, String> {
    sqlx::query("DELETE FROM customer_addresses WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn set_default_address(
    pool: State<'_, SqlitePool>, id: i64, customer_id: i64,
) -> Result<serde_json::Value, String> {
    sqlx::query("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?")
        .bind(customer_id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    sqlx::query("UPDATE customer_addresses SET is_default = 1 WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}
