use crate::database::get_connection;
use std::fs;
use std::path::PathBuf;
use sqlx::Row;

fn db_file_path() -> Result<PathBuf, String> {
    let base = dirs::data_dir().ok_or("Could not get data directory")?;
    Ok(base.join("FoodPaaji").join("foodpaaji.db"))
}

#[tauri::command]
pub async fn backup_database(target_path: String) -> Result<bool, String> {
    // Ensure DB is reachable
    let _ = get_connection().await.map_err(|e| e.to_string())?;
    let src = db_file_path()?;
    let dest = PathBuf::from(target_path);
    fs::create_dir_all(dest.parent().ok_or("Invalid target path")?)
        .map_err(|e| e.to_string())?;
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn restore_database(source_path: String) -> Result<bool, String> {
    let _ = get_connection().await.map_err(|e| e.to_string())?;
    let dest = db_file_path()?;
    let src = PathBuf::from(source_path);
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn seed_sample_data() -> Result<bool, String> {
    let pool = get_connection().await.map_err(|e| e.to_string())?;
    // Simple idempotent inserts for development only
    let _ = sqlx::query!(
        "INSERT OR IGNORE INTO restaurants (id, name, slug, email, phone, address) VALUES (1, 'FoodPaaji Demo', 'foodpaaji-demo', 'demo@foodpaaji.com', '+919876543210', 'Kolkata')"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // Prepare a secure hash for a known dev password only at runtime
    let dev_password = std::env::var("FOODPAAJI_DEV_PASSWORD").unwrap_or_else(|_| "devpass123".to_string());
    let salt = bcrypt::DEFAULT_COST;
    let hashed = bcrypt::hash(dev_password, salt).map_err(|e| e.to_string())?;

    let _ = sqlx::query!(
        "INSERT OR IGNORE INTO users (restaurant_id, email, phone, password_hash, first_name, last_name, role, permissions) VALUES (1, 'dev@foodpaaji.com', '+919876500000', ?, 'Dev', 'User', 'MANAGER', '[]')"
    )
    .bind(hashed)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(true)
}
