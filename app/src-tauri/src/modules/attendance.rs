use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{Utc, NaiveDateTime, NaiveDate};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct AttendanceRecord {
    pub id: i64,
    pub employee_id: i64,
    pub date: NaiveDate,
    pub clock_in: Option<NaiveDateTime>,
    pub clock_out: Option<NaiveDateTime>,
    pub break_start: Option<NaiveDateTime>,
    pub break_end: Option<NaiveDateTime>,
    pub total_hours: Option<f64>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Deserialize)]
pub struct ClockInRequest {
    pub employee_id: i64,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct ClockOutRequest {
    pub employee_id: i64,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct BreakRequest {
    pub employee_id: i64,
    pub break_type: String,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct AttendanceReportRequest {
    pub employee_id: Option<i64>,
    pub start_date: String,
    pub end_date: String,
    pub restaurant_id: i64,
}

#[derive(Serialize)]
pub struct AttendanceReport {
    pub records: Vec<AttendanceRecord>,
    pub total_hours: f64,
    pub total_days: i64,
    pub average_hours_per_day: f64,
}

pub async fn fetch_today_record(employee_id: i64, db: &DbPool) -> Result<Option<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    sqlx::query_as::<_, AttendanceRecord>("SELECT * FROM attendance WHERE employee_id = ? AND date = ?")
        .bind(employee_id).bind(today).fetch_optional(db).await
        .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub async fn clock_in(
    request: ClockInRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    match fetch_today_record(request.employee_id, &db).await {
        Ok(Some(existing)) if existing.clock_in.is_some() && existing.clock_out.is_none() =>
            return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Already clocked in today".to_string()) }),
        Err(e) =>
            return Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        _ => {}
    }

    match sqlx::query(
        "INSERT INTO attendance (employee_id, date, clock_in, status, notes)
         VALUES (?, ?, ?, 'PRESENT', ?)
         ON CONFLICT(employee_id, date) DO UPDATE SET
         clock_in = excluded.clock_in, status = excluded.status,
         notes = excluded.notes, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(request.employee_id).bind(today).bind(now).bind(&request.notes)
    .execute(&*db).await
    {
        Ok(_) => match sqlx::query_as::<_, AttendanceRecord>("SELECT * FROM attendance WHERE employee_id = ? AND date = ?")
            .bind(request.employee_id).bind(today).fetch_one(&*db).await
        {
            Ok(record) => Ok(ApiResponse { success: true, data: Some(record), message: Some("Clocked in successfully".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Failed to fetch record: {}", e)) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn clock_out(
    request: ClockOutRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    match fetch_today_record(request.employee_id, &db).await {
        Ok(None) => return Ok(ApiResponse { success: false, data: None, message: None, error: Some("No clock-in record found for today".to_string()) }),
        Ok(Some(r)) if r.clock_in.is_none() => return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Must clock in before clocking out".to_string()) }),
        Ok(Some(r)) if r.clock_out.is_some() => return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Already clocked out today".to_string()) }),
        Err(e) => return Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        Ok(Some(mut record)) => {
            let total_hours = (now - record.clock_in.unwrap()).num_seconds() as f64 / 3600.0;
            match sqlx::query(
                "UPDATE attendance SET clock_out = ?, total_hours = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND date = ?"
            )
            .bind(now).bind(total_hours).bind(&request.notes).bind(request.employee_id).bind(today)
            .execute(&*db).await
            {
                Ok(_) => {
                    record.clock_out = Some(now);
                    record.total_hours = Some(total_hours);
                    record.notes = request.notes;
                    Ok(ApiResponse { success: true, data: Some(record), message: Some("Clocked out successfully".to_string()), error: None })
                },
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
            }
        }
    }
}
