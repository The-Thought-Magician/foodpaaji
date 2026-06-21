use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct Campaign {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub campaign_type: String,
    pub target_segment: Option<String>,
    pub discount_percent: Option<f64>,
    pub discount_amount: Option<f64>,
    pub min_order_value: Option<f64>,
    pub promo_code: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub budget: Option<f64>,
    pub spent: f64,
    pub redemption_count: i64,
    pub max_redemptions: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCampaignRequest {
    pub name: String,
    pub description: Option<String>,
    pub campaign_type: String,
    pub target_segment: Option<String>,
    pub discount_percent: Option<f64>,
    pub discount_amount: Option<f64>,
    pub min_order_value: Option<f64>,
    pub promo_code: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub budget: Option<f64>,
    pub max_redemptions: Option<i64>,
}

fn row_to_campaign(r: &sqlx::sqlite::SqliteRow) -> Campaign {
    Campaign {
        id: r.get("id"), name: r.get("name"), description: r.get("description"),
        campaign_type: r.get("campaign_type"), target_segment: r.get("target_segment"),
        discount_percent: r.get("discount_percent"), discount_amount: r.get("discount_amount"),
        min_order_value: r.get("min_order_value"), promo_code: r.get("promo_code"),
        start_date: r.get("start_date"), end_date: r.get("end_date"), status: r.get("status"),
        budget: r.get("budget"), spent: r.get("spent"), redemption_count: r.get("redemption_count"),
        max_redemptions: r.get("max_redemptions"),
    }
}

#[tauri::command]
pub async fn get_campaigns(
    status: Option<String>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<Campaign>>, String> {
    let rows = match status {
        Some(s) => sqlx::query("SELECT * FROM campaigns WHERE status = ? ORDER BY created_at DESC")
            .bind(s).fetch_all(&*db).await,
        None => sqlx::query("SELECT * FROM campaigns ORDER BY created_at DESC")
            .fetch_all(&*db).await,
    }.map_err(|e| e.to_string())?;

    Ok(ApiResponse { success: true, data: Some(rows.iter().map(row_to_campaign).collect()), message: None, error: None })
}

#[tauri::command]
pub async fn create_campaign(
    request: CreateCampaignRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Campaign>, String> {
    let result = sqlx::query(
        "INSERT INTO campaigns (name, description, campaign_type, target_segment, discount_percent,
         discount_amount, min_order_value, promo_code, start_date, end_date, budget, max_redemptions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&request.name).bind(&request.description).bind(&request.campaign_type)
    .bind(&request.target_segment).bind(request.discount_percent).bind(request.discount_amount)
    .bind(request.min_order_value).bind(&request.promo_code)
    .bind(&request.start_date).bind(&request.end_date)
    .bind(request.budget).bind(request.max_redemptions)
    .execute(&*db).await.map_err(|e| e.to_string())?;

    let row = sqlx::query("SELECT * FROM campaigns WHERE id = ?")
        .bind(result.last_insert_rowid()).fetch_one(&*db).await.map_err(|e| e.to_string())?;

    Ok(ApiResponse { success: true, data: Some(row_to_campaign(&row)), message: Some("Campaign created".to_string()), error: None })
}

#[tauri::command]
pub async fn update_campaign_status(
    campaign_id: i64,
    status: String,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    sqlx::query("UPDATE campaigns SET status = ? WHERE id = ?")
        .bind(&status).bind(campaign_id).execute(&*db).await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { success: true, data: None, message: Some("Status updated".to_string()), error: None })
}

#[tauri::command]
pub async fn delete_campaign(
    campaign_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    sqlx::query("DELETE FROM campaigns WHERE id = ?")
        .bind(campaign_id).execute(&*db).await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { success: true, data: None, message: Some("Campaign deleted".to_string()), error: None })
}
