use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCouponRequest {
    pub code: String,
    pub description: Option<String>,
    pub discount_type: String,
    pub discount_value: f64,
    pub min_order_amount: f64,
    pub max_uses: Option<i64>,
    pub valid_until: Option<String>,
}

#[tauri::command]
pub async fn create_coupon(pool: State<'_, SqlitePool>, request: CreateCouponRequest) -> Result<serde_json::Value, String> {
    let code = request.code.to_uppercase();
    sqlx::query!(
        "INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_uses, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?)",
        code, request.description, request.discount_type, request.discount_value,
        request.min_order_amount, request.max_uses, request.valid_until
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn validate_coupon(pool: State<'_, SqlitePool>, code: String, order_amount: f64) -> Result<serde_json::Value, String> {
    let code = code.to_uppercase();
    let now = Local::now().to_rfc3339();

    let coupon = sqlx::query!(
        "SELECT id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_until FROM coupons WHERE code = ? AND is_active = 1 AND (valid_until IS NULL OR valid_until > ?) AND (max_uses IS NULL OR used_count < max_uses)",
        code, now
    )
    .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let Some(c) = coupon else {
        return Ok(serde_json::json!({ "valid": false, "error": "Invalid or expired coupon" }));
    };

    if order_amount < c.min_order_amount {
        return Ok(serde_json::json!({
            "valid": false,
            "error": format!("Minimum order amount ₹{:.0} required", c.min_order_amount)
        }));
    }

    let discount = if c.discount_type == "percent" {
        order_amount * c.discount_value / 100.0
    } else {
        c.discount_value.min(order_amount)
    };

    Ok(serde_json::json!({
        "valid": true,
        "coupon_id": c.id,
        "discount_type": c.discount_type,
        "discount_value": c.discount_value,
        "discount_amount": discount,
        "final_amount": order_amount - discount
    }))
}

#[tauri::command]
pub async fn apply_coupon(pool: State<'_, SqlitePool>, coupon_id: i64) -> Result<serde_json::Value, String> {
    sqlx::query!(
        "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?",
        coupon_id
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_coupons(pool: State<'_, SqlitePool>) -> Result<serde_json::Value, String> {
    let rows = sqlx::query!(
        "SELECT id, code, description, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_until, is_active FROM coupons ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
    .into_iter().map(|r| serde_json::json!({
        "id": r.id, "code": r.code, "description": r.description,
        "discount_type": r.discount_type, "discount_value": r.discount_value,
        "min_order_amount": r.min_order_amount, "max_uses": r.max_uses,
        "used_count": r.used_count, "valid_until": r.valid_until, "is_active": r.is_active
    })).collect::<Vec<_>>();
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

#[tauri::command]
pub async fn toggle_coupon(pool: State<'_, SqlitePool>, coupon_id: i64) -> Result<serde_json::Value, String> {
    sqlx::query!(
        "UPDATE coupons SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?",
        coupon_id
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}
