use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePromotionRequest {
    pub title: String,
    pub description: Option<String>,
    pub promo_code: Option<String>,
    pub discount_type: String,
    pub discount_value: f64,
    pub min_order_amount: f64,
    pub max_discount_amount: Option<f64>,
    pub usage_limit: Option<i64>,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAnnouncementRequest {
    pub title: String,
    pub body: String,
    pub target: String,
    pub priority: String,
    pub expires_at: Option<String>,
}

#[tauri::command]
pub async fn create_promotion(pool: State<'_, SqlitePool>, request: CreatePromotionRequest) -> Result<serde_json::Value, String> {
    let id = sqlx::query!(
        "INSERT INTO promotions (title, description, promo_code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        request.title, request.description, request.promo_code, request.discount_type,
        request.discount_value, request.min_order_amount, request.max_discount_amount,
        request.usage_limit, request.start_date, request.end_date
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?.last_insert_rowid();
    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
pub async fn get_promotions(pool: State<'_, SqlitePool>, active_only: Option<bool>) -> Result<serde_json::Value, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let rows = if active_only.unwrap_or(false) {
        sqlx::query!("SELECT id, title, description, promo_code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, usage_count, start_date, end_date, is_active FROM promotions WHERE is_active = 1 AND start_date <= ? AND end_date >= ? ORDER BY created_at DESC", today, today)
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "title": r.title, "description": r.description, "promo_code": r.promo_code, "discount_type": r.discount_type, "discount_value": r.discount_value, "min_order_amount": r.min_order_amount, "usage_count": r.usage_count, "usage_limit": r.usage_limit, "start_date": r.start_date, "end_date": r.end_date, "is_active": r.is_active })).collect::<Vec<_>>()
    } else {
        sqlx::query!("SELECT id, title, description, promo_code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, usage_count, start_date, end_date, is_active FROM promotions ORDER BY created_at DESC")
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "title": r.title, "description": r.description, "promo_code": r.promo_code, "discount_type": r.discount_type, "discount_value": r.discount_value, "min_order_amount": r.min_order_amount, "usage_count": r.usage_count, "usage_limit": r.usage_limit, "start_date": r.start_date, "end_date": r.end_date, "is_active": r.is_active })).collect::<Vec<_>>()
    };
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

#[tauri::command]
pub async fn validate_promo_code(pool: State<'_, SqlitePool>, code: String, order_amount: f64) -> Result<serde_json::Value, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let promo = sqlx::query!(
        "SELECT id, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, usage_count FROM promotions WHERE promo_code = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?",
        code, today, today
    ).fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    match promo {
        None => Ok(serde_json::json!({ "valid": false, "message": "Invalid or expired promo code" })),
        Some(p) => {
            if order_amount < p.min_order_amount {
                return Ok(serde_json::json!({ "valid": false, "message": format!("Minimum order amount is ₹{:.0}", p.min_order_amount) }));
            }
            if let Some(limit) = p.usage_limit {
                if p.usage_count >= limit {
                    return Ok(serde_json::json!({ "valid": false, "message": "Promo code usage limit reached" }));
                }
            }
            let discount = match p.discount_type.as_str() {
                "percent" => {
                    let d = order_amount * p.discount_value / 100.0;
                    if let Some(max) = p.max_discount_amount { d.min(max) } else { d }
                },
                "fixed" => p.discount_value.min(order_amount),
                _ => 0.0,
            };
            Ok(serde_json::json!({ "valid": true, "promo_id": p.id, "discount_type": p.discount_type, "discount_value": p.discount_value, "discount_amount": discount }))
        }
    }
}

#[tauri::command]
pub async fn apply_promo(pool: State<'_, SqlitePool>, promo_id: i64) -> Result<serde_json::Value, String> {
    sqlx::query!("UPDATE promotions SET usage_count = usage_count + 1 WHERE id = ?", promo_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn toggle_promotion(pool: State<'_, SqlitePool>, promo_id: i64) -> Result<serde_json::Value, String> {
    sqlx::query!("UPDATE promotions SET is_active = NOT is_active, updated_at = datetime('now') WHERE id = ?", promo_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn create_announcement(pool: State<'_, SqlitePool>, request: CreateAnnouncementRequest) -> Result<serde_json::Value, String> {
    let id = sqlx::query!(
        "INSERT INTO announcements (title, body, target, priority, expires_at) VALUES (?, ?, ?, ?, ?)",
        request.title, request.body, request.target, request.priority, request.expires_at
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?.last_insert_rowid();
    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
pub async fn get_announcements(pool: State<'_, SqlitePool>, active_only: Option<bool>) -> Result<serde_json::Value, String> {
    let now = chrono::Local::now().to_rfc3339();
    let rows = if active_only.unwrap_or(false) {
        sqlx::query!("SELECT id, title, body, target, priority, is_active, expires_at, created_at FROM announcements WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?) ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at DESC", now)
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "title": r.title, "body": r.body, "target": r.target, "priority": r.priority, "expires_at": r.expires_at, "created_at": r.created_at })).collect::<Vec<_>>()
    } else {
        sqlx::query!("SELECT id, title, body, target, priority, is_active, expires_at, created_at FROM announcements ORDER BY created_at DESC LIMIT 50")
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "title": r.title, "body": r.body, "target": r.target, "priority": r.priority, "is_active": r.is_active, "expires_at": r.expires_at, "created_at": r.created_at })).collect::<Vec<_>>()
    };
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

#[tauri::command]
pub async fn dismiss_announcement(pool: State<'_, SqlitePool>, announcement_id: i64) -> Result<serde_json::Value, String> {
    sqlx::query!("UPDATE announcements SET is_active = 0, updated_at = datetime('now') WHERE id = ?", announcement_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}
