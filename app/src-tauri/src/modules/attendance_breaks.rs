use crate::database::DbPool;
use crate::types::ApiResponse;
use crate::modules::attendance::{AttendanceRecord, AttendanceReport, AttendanceReportRequest, BreakRequest};
use tauri::State;
use chrono::Utc;

#[tauri::command]
pub async fn start_break(
    request: BreakRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    match sqlx::query(
        "UPDATE attendance SET break_start = ?, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = ? AND date = ? AND clock_in IS NOT NULL AND clock_out IS NULL"
    )
    .bind(now).bind(request.employee_id).bind(today).execute(&*db).await
    {
        Ok(result) if result.rows_affected() > 0 =>
            match sqlx::query_as::<_, AttendanceRecord>("SELECT * FROM attendance WHERE employee_id = ? AND date = ?")
                .bind(request.employee_id).bind(today).fetch_one(&*db).await
            {
                Ok(record) => Ok(ApiResponse { success: true, data: Some(record), message: Some("Break started".to_string()), error: None }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Failed to fetch record: {}", e)) }),
            },
        Ok(_) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("Must be clocked in to start break".to_string()) }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn end_break(
    request: BreakRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    match sqlx::query(
        "UPDATE attendance SET break_end = ?, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = ? AND date = ? AND break_start IS NOT NULL AND break_end IS NULL"
    )
    .bind(now).bind(request.employee_id).bind(today).execute(&*db).await
    {
        Ok(result) if result.rows_affected() > 0 =>
            match sqlx::query_as::<_, AttendanceRecord>("SELECT * FROM attendance WHERE employee_id = ? AND date = ?")
                .bind(request.employee_id).bind(today).fetch_one(&*db).await
            {
                Ok(record) => Ok(ApiResponse { success: true, data: Some(record), message: Some("Break ended".to_string()), error: None }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Failed to fetch record: {}", e)) }),
            },
        Ok(_) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("No active break found".to_string()) }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_attendance_report(
    request: AttendanceReportRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceReport>, String> {
    let mut query = "SELECT * FROM attendance a \
                     JOIN users u ON a.employee_id = u.id \
                     WHERE u.restaurant_id = ? AND a.date BETWEEN ? AND ?".to_string();
    let mut params = vec![request.restaurant_id.to_string(), request.start_date.clone(), request.end_date.clone()];

    if let Some(employee_id) = request.employee_id {
        query.push_str(" AND a.employee_id = ?");
        params.push(employee_id.to_string());
    }
    query.push_str(" ORDER BY a.date DESC, u.first_name");

    let mut sql_query = sqlx::query_as::<_, AttendanceRecord>(&query);
    for param in &params { sql_query = sql_query.bind(param); }

    match sql_query.fetch_all(&*db).await {
        Ok(records) => {
            let total_hours: f64 = records.iter().filter_map(|r| r.total_hours).sum();
            let total_days = records.len() as i64;
            let average_hours_per_day = if total_days > 0 { total_hours / total_days as f64 } else { 0.0 };
            Ok(ApiResponse { success: true, data: Some(AttendanceReport { records, total_hours, total_days, average_hours_per_day }), message: None, error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
