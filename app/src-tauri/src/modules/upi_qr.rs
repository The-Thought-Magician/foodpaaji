use sqlx::{SqlitePool, Row};
use tauri::State;

#[tauri::command]
pub async fn generate_upi_qr_string(
    pool: State<'_, SqlitePool>,
    bill_id: i64,
    upi_id: String,
    merchant_name: String,
) -> Result<serde_json::Value, String> {
    let row = sqlx::query(
        "SELECT bill_number, total_amount FROM bills WHERE id = ?"
    )
    .bind(bill_id)
    .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?
    .ok_or("Bill not found")?;

    let bill_number: String = row.try_get("bill_number").unwrap_or_default();
    let amount: f64 = row.try_get("amount").unwrap_or_else(|_| {
        row.try_get("total_amount").unwrap_or(0.0)
    });

    let upi_url = format!(
        "upi://pay?pa={}&pn={}&am={:.2}&cu=INR&tn={}",
        urlenccode(&upi_id),
        urlenccode(&merchant_name),
        amount,
        urlenccode(&format!("Bill {}", bill_number)),
    );

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "upi_url": upi_url,
            "amount": amount,
            "bill_number": bill_number,
            "upi_id": upi_id,
        }
    }))
}

fn urlenccode(s: &str) -> String {
    s.chars().map(|c| match c {
        'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
        ' ' => "%20".to_string(),
        '@' => "%40".to_string(),
        _ => format!("%{:02X}", c as u32),
    }).collect()
}

#[tauri::command]
pub async fn get_upi_settings(
    pool: State<'_, SqlitePool>,
) -> Result<serde_json::Value, String> {
    let row = sqlx::query(
        "SELECT value FROM app_settings WHERE key = 'upi_id'"
    )
    .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let upi_id = row.map(|r| r.try_get::<String, _>("value").unwrap_or_default());

    let row2 = sqlx::query(
        "SELECT value FROM app_settings WHERE key = 'merchant_name'"
    )
    .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let merchant_name = row2.map(|r| r.try_get::<String, _>("value").unwrap_or_default());

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "upi_id": upi_id,
            "merchant_name": merchant_name,
        }
    }))
}

#[tauri::command]
pub async fn save_upi_settings(
    pool: State<'_, SqlitePool>,
    upi_id: String,
    merchant_name: String,
) -> Result<serde_json::Value, String> {
    sqlx::query(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('upi_id', ?)"
    )
    .bind(&upi_id)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('merchant_name', ?)"
    )
    .bind(&merchant_name)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}
