use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::Serialize;
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct TableUtilization {
    pub table_id: i64,
    pub table_number: String,
    pub capacity: i64,
    pub location: Option<String>,
    pub total_reservations: i64,
    pub completed_reservations: i64,
    pub cancelled_reservations: i64,
    pub no_show_count: i64,
    pub avg_party_size: f64,
    pub utilization_rate: f64,
    pub avg_duration_minutes: f64,
    pub revenue_estimate: f64,
}

#[derive(Debug, Serialize)]
pub struct TableAnalyticsSummary {
    pub tables: Vec<TableUtilization>,
    pub busiest_day: String,
    pub busiest_hour: i64,
    pub overall_utilization: f64,
    pub total_covers: i64,
}

#[tauri::command]
pub async fn get_table_utilization(
    days: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<TableAnalyticsSummary>, String> {
    let days = days.unwrap_or(30);

    let tables_result = sqlx::query(
        "SELECT t.id, t.table_number, t.capacity, t.location,
         COUNT(r.id) as total_reservations,
         SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN r.status = 'no_show' THEN 1 ELSE 0 END) as no_show,
         COALESCE(AVG(CASE WHEN r.status = 'completed' THEN r.party_size END), 0) as avg_party,
         COALESCE(AVG(CASE WHEN r.status = 'completed' THEN r.duration_minutes END), 0) as avg_duration
         FROM tables t
         LEFT JOIN reservations r ON r.table_id = t.id
           AND r.reservation_date >= date('now', ? || ' days')
           AND r.status != 'pending'
         WHERE t.is_active = 1
         GROUP BY t.id, t.table_number, t.capacity, t.location
         ORDER BY completed DESC"
    )
    .bind(format!("-{}", days))
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    // Calculate available slots per table (assume 10 slots/day × days)
    let available_slots = (days * 10) as f64;

    let tables: Vec<TableUtilization> = tables_result.iter().map(|r| {
        let completed: i64 = r.get("completed");
        let utilization = if available_slots > 0.0 {
            (completed as f64 / available_slots * 100.0).min(100.0)
        } else { 0.0 };
        let avg_party: f64 = r.get("avg_party");
        // Rough revenue estimate: avg bill ₹600 per cover
        let revenue = completed as f64 * avg_party * 600.0;
        TableUtilization {
            table_id: r.get("id"),
            table_number: r.get("table_number"),
            capacity: r.get("capacity"),
            location: r.get("location"),
            total_reservations: r.get("total_reservations"),
            completed_reservations: completed,
            cancelled_reservations: r.get("cancelled"),
            no_show_count: r.get("no_show"),
            avg_party_size: avg_party,
            utilization_rate: (utilization * 10.0).round() / 10.0,
            avg_duration_minutes: r.get("avg_duration"),
            revenue_estimate: revenue,
        }
    }).collect();

    let busiest_day_row = sqlx::query(
        "SELECT strftime('%w', reservation_date) as dow, COUNT(*) as cnt
         FROM reservations
         WHERE reservation_date >= date('now', ? || ' days') AND status = 'completed'
         GROUP BY dow ORDER BY cnt DESC LIMIT 1"
    )
    .bind(format!("-{}", days))
    .fetch_optional(&*db)
    .await
    .unwrap_or(None);

    let day_names = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    let busiest_day = busiest_day_row
        .as_ref()
        .map(|r| {
            let dow: &str = r.get("dow");
            dow.parse::<usize>().ok()
                .and_then(|i| day_names.get(i))
                .map(|s| s.to_string())
                .unwrap_or_else(|| "N/A".to_string())
        })
        .unwrap_or_else(|| "N/A".to_string());

    let busiest_hour_row = sqlx::query(
        "SELECT CAST(substr(reservation_time, 1, 2) AS INTEGER) as hour, COUNT(*) as cnt
         FROM reservations
         WHERE reservation_date >= date('now', ? || ' days') AND status = 'completed'
           AND reservation_time IS NOT NULL AND reservation_time != ''
         GROUP BY hour ORDER BY cnt DESC LIMIT 1"
    )
    .bind(format!("-{}", days))
    .fetch_optional(&*db)
    .await
    .unwrap_or(None);

    let busiest_hour: i64 = busiest_hour_row
        .as_ref()
        .map(|r| r.get("hour"))
        .unwrap_or(19);

    let total_completed: i64 = tables.iter().map(|t| t.completed_reservations).sum();
    let total_avg_party: f64 = if total_completed > 0 {
        tables.iter().map(|t| t.avg_party_size * t.completed_reservations as f64).sum::<f64>()
            / total_completed as f64
    } else { 0.0 };
    let total_covers = (total_completed as f64 * total_avg_party).round() as i64;

    let overall_utilization = if !tables.is_empty() {
        tables.iter().map(|t| t.utilization_rate).sum::<f64>() / tables.len() as f64
    } else { 0.0 };

    Ok(ApiResponse {
        success: true,
        data: Some(TableAnalyticsSummary {
            tables,
            busiest_day,
            busiest_hour,
            overall_utilization: (overall_utilization * 10.0).round() / 10.0,
            total_covers,
        }),
        message: None,
        error: None,
    })
}
