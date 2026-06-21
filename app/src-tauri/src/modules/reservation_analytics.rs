use crate::types::ApiResponse;
use serde::Serialize;
use sqlx::{Row, SqlitePool};
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ReservationAnalytics {
    pub total_reservations: i64,
    pub completed: i64,
    pub cancelled: i64,
    pub no_shows: i64,
    pub no_show_rate: f64,
    pub avg_party_size: f64,
    pub avg_duration: f64,
    pub completion_rate: f64,
    pub busiest_day: String,
    pub busiest_time: String,
    pub daily_breakdown: Vec<DayCount>,
    pub status_breakdown: Vec<StatusCount>,
}

#[derive(Debug, Serialize)]
pub struct DayCount {
    pub day: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[tauri::command]
pub async fn get_reservation_analytics(
    days: Option<i64>,
    pool: State<'_, SqlitePool>,
) -> Result<ApiResponse<ReservationAnalytics>, String> {
    let days = days.unwrap_or(30);
    let date_filter = format!("-{}", days);

    let summary = sqlx::query(
        "SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
           SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
           COALESCE(AVG(party_size), 0) as avg_party,
           COALESCE(AVG(duration_minutes), 0) as avg_duration
         FROM reservations WHERE reservation_date >= date('now', ?)"
    ).bind(&date_filter).fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;

    let total: i64 = summary.get("total");
    let completed: i64 = summary.get("completed");
    let no_shows: i64 = summary.get("no_shows");

    let day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let by_day = sqlx::query(
        "SELECT strftime('%w', reservation_date) as dow, COUNT(*) as cnt
         FROM reservations WHERE reservation_date >= date('now', ?)
         GROUP BY dow ORDER BY dow"
    ).bind(&date_filter).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let daily_breakdown: Vec<DayCount> = by_day.iter().map(|r| {
        let dow: String = r.get("dow");
        let idx = dow.parse::<usize>().unwrap_or(0);
        DayCount { day: day_names.get(idx).unwrap_or(&"?").to_string(), count: r.get("cnt") }
    }).collect();

    let busiest_day = daily_breakdown.iter().max_by_key(|d| d.count)
        .map(|d| d.day.clone()).unwrap_or_else(|| "N/A".to_string());

    let peak_time = sqlx::query(
        "SELECT substr(reservation_time, 1, 5) as t, COUNT(*) as cnt
         FROM reservations WHERE reservation_date >= date('now', ?) AND reservation_time IS NOT NULL
         GROUP BY t ORDER BY cnt DESC LIMIT 1"
    ).bind(&date_filter).fetch_optional(pool.inner()).await.unwrap_or(None);

    let busiest_time = peak_time.as_ref()
        .map(|r| r.get::<String, _>("t"))
        .unwrap_or_else(|| "19:00".to_string());

    let by_status = sqlx::query(
        "SELECT status, COUNT(*) as cnt FROM reservations
         WHERE reservation_date >= date('now', ?) GROUP BY status"
    ).bind(&date_filter).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let status_breakdown: Vec<StatusCount> = by_status.iter().map(|r| StatusCount {
        status: r.get("status"), count: r.get("cnt"),
    }).collect();

    let no_show_rate = if total > 0 { no_shows as f64 / total as f64 * 100.0 } else { 0.0 };
    let completion_rate = if total > 0 { completed as f64 / total as f64 * 100.0 } else { 0.0 };

    Ok(ApiResponse {
        success: true,
        data: Some(ReservationAnalytics {
            total_reservations: total,
            completed,
            cancelled: summary.get("cancelled"),
            no_shows,
            no_show_rate: (no_show_rate * 10.0).round() / 10.0,
            avg_party_size: summary.get("avg_party"),
            avg_duration: summary.get("avg_duration"),
            completion_rate: (completion_rate * 10.0).round() / 10.0,
            busiest_day,
            busiest_time,
            daily_breakdown,
            status_breakdown,
        }),
        message: None,
        error: None,
    })
}
