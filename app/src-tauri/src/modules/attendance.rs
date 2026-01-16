use crate::database::DbPool;
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{Utc, NaiveDateTime, NaiveDate};
use sqlx::FromRow;
use sqlx::Row;

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

#[tauri::command]
pub async fn clock_in(
    request: ClockInRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    // Check if employee already clocked in today
    match sqlx::query_as::<_, AttendanceRecord>(
        "SELECT * FROM attendance WHERE employee_id = ? AND date = ?"
    )
    .bind(request.employee_id)
    .bind(today)
    .fetch_optional(&*db)
    .await
    {
        Ok(Some(existing)) => {
            if existing.clock_in.is_some() && existing.clock_out.is_none() {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Already clocked in today".to_string()),
                });
            }
        },
        Ok(None) => {},
        Err(e) => return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }

    match sqlx::query!(
        "INSERT INTO attendance (employee_id, date, clock_in, status, notes) 
         VALUES (?, ?, ?, 'PRESENT', ?)
         ON CONFLICT(employee_id, date) DO UPDATE SET 
         clock_in = excluded.clock_in, 
         status = excluded.status,
         notes = excluded.notes,
         updated_at = CURRENT_TIMESTAMP"
    )
    .bind(request.employee_id)
    .bind(today)
    .bind(now)
    .bind(&request.notes)
    .execute(&*db)
    .await
    {
        Ok(_) => {
            match sqlx::query_as::<_, AttendanceRecord>(
                "SELECT * FROM attendance WHERE employee_id = ? AND date = ?"
            )
            .bind(request.employee_id)
            .bind(today)
            .fetch_one(&*db)
            .await
            {
                Ok(record) => Ok(ApiResponse {
                    success: true,
                    data: Some(record),
                    message: Some("Clocked in successfully".to_string()),
                    error: None,
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(format!("Failed to fetch record: {}", e)),
                })
            }
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn clock_out(
    request: ClockOutRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    match sqlx::query_as::<_, AttendanceRecord>(
        "SELECT * FROM attendance WHERE employee_id = ? AND date = ?"
    )
    .bind(request.employee_id)
    .bind(today)
    .fetch_optional(&*db)
    .await
    {
        Ok(Some(mut record)) => {
            if record.clock_in.is_none() {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Must clock in before clocking out".to_string()),
                });
            }

            if record.clock_out.is_some() {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Already clocked out today".to_string()),
                });
            }

            let clock_in_time = record.clock_in.unwrap();
            let total_hours = (now - clock_in_time).num_seconds() as f64 / 3600.0;

            match sqlx::query!(
                "UPDATE attendance SET clock_out = ?, total_hours = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE employee_id = ? AND date = ?"
            )
            .bind(now)
            .bind(total_hours)
            .bind(&request.notes)
            .bind(request.employee_id)
            .bind(today)
            .execute(&*db)
            .await
            {
                Ok(_) => {
                    record.clock_out = Some(now);
                    record.total_hours = Some(total_hours);
                    record.notes = request.notes;
                    
                    Ok(ApiResponse {
                        success: true,
                        data: Some(record),
                        message: Some("Clocked out successfully".to_string()),
                        error: None,
                    })
                },
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(format!("Database error: {}", e)),
                })
            }
        },
        Ok(None) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("No clock-in record found for today".to_string()),
        }),
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn start_break(
    request: BreakRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    match sqlx::query!(
        "UPDATE attendance SET break_start = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE employee_id = ? AND date = ? AND clock_in IS NOT NULL AND clock_out IS NULL"
    )
    .bind(now)
    .bind(request.employee_id)
    .bind(today)
    .execute(&*db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                match sqlx::query_as::<_, AttendanceRecord>(
                    "SELECT * FROM attendance WHERE employee_id = ? AND date = ?"
                )
                .bind(request.employee_id)
                .bind(today)
                .fetch_one(&*db)
                .await
                {
                    Ok(record) => Ok(ApiResponse {
                        success: true,
                        data: Some(record),
                        message: Some("Break started".to_string()),
                        error: None,
                    }),
                    Err(e) => Ok(ApiResponse {
                        success: false,
                        data: None,
                        message: None,
                        error: Some(format!("Failed to fetch record: {}", e)),
                    })
                }
            } else {
                Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Must be clocked in to start break".to_string()),
                })
            }
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn end_break(
    request: BreakRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceRecord>, String> {
    let today = Utc::now().date_naive();
    let now = Utc::now().naive_utc();

    match sqlx::query!(
        "UPDATE attendance SET break_end = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE employee_id = ? AND date = ? AND break_start IS NOT NULL AND break_end IS NULL"
    )
    .bind(now)
    .bind(request.employee_id)
    .bind(today)
    .execute(&*db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                match sqlx::query_as::<_, AttendanceRecord>(
                    "SELECT * FROM attendance WHERE employee_id = ? AND date = ?"
                )
                .bind(request.employee_id)
                .bind(today)
                .fetch_one(&*db)
                .await
                {
                    Ok(record) => Ok(ApiResponse {
                        success: true,
                        data: Some(record),
                        message: Some("Break ended".to_string()),
                        error: None,
                    }),
                    Err(e) => Ok(ApiResponse {
                        success: false,
                        data: None,
                        message: None,
                        error: Some(format!("Failed to fetch record: {}", e)),
                    })
                }
            } else {
                Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("No active break found".to_string()),
                })
            }
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn get_attendance_report(
    request: AttendanceReportRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<AttendanceReport>, String> {
    let mut query = "SELECT * FROM attendance a 
                     JOIN users u ON a.employee_id = u.id 
                     WHERE u.restaurant_id = ? AND a.date BETWEEN ? AND ?".to_string();
    
    let mut params = vec![
        request.restaurant_id.to_string(),
        request.start_date.clone(),
        request.end_date.clone(),
    ];

    if let Some(employee_id) = request.employee_id {
        query.push_str(" AND a.employee_id = ?");
        params.push(employee_id.to_string());
    }

    query.push_str(" ORDER BY a.date DESC, u.first_name");

    let mut sql_query = sqlx::query_as::<_, AttendanceRecord>(&query);
    for param in &params {
        sql_query = sql_query.bind(param);
    }

    match sql_query.fetch_all(&*db).await {
        Ok(records) => {
            let total_hours: f64 = records.iter()
                .filter_map(|r| r.total_hours)
                .sum();
            
            let total_days = records.len() as i64;
            let average_hours_per_day = if total_days > 0 { 
                total_hours / total_days as f64 
            } else { 
                0.0 
            };

            Ok(ApiResponse {
                success: true,
                data: Some(AttendanceReport {
                    records,
                    total_hours,
                    total_days,
                    average_hours_per_day,
                }),
                message: None,
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}