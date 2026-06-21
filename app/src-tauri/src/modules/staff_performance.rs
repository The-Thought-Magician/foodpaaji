use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn get_staff_performance(
    pool: State<'_, SqlitePool>,
    days: Option<i64>,
) -> Result<serde_json::Value, String> {
    let days = days.unwrap_or(30);

    let rows = sqlx::query(
        "SELECT e.id, e.name, e.role,
           COUNT(DISTINCT a.id) as days_present,
           COALESCE(SUM(CASE WHEN a.clock_out IS NOT NULL
             THEN (julianday(a.clock_out) - julianday(a.clock_in)) * 24 ELSE 0 END), 0) as total_hours,
           COUNT(DISTINCT s.id) as shifts_assigned
         FROM employees e
         LEFT JOIN attendance a ON e.id = a.employee_id AND a.clock_in >= datetime('now', '-' || ? || ' days')
         LEFT JOIN staff_shifts s ON e.id = s.employee_id AND s.shift_date >= date('now', '-' || ? || ' days')
         GROUP BY e.id
         ORDER BY total_hours DESC"
    )
    .bind(days).bind(days)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let staff: Vec<serde_json::Value> = rows.iter().map(|r| {
        let hours = r.try_get::<f64, _>("total_hours").unwrap_or(0.0);
        let present = r.try_get::<i64, _>("days_present").unwrap_or(0);
        let shifts = r.try_get::<i64, _>("shifts_assigned").unwrap_or(0);
        let attendance_rate = if shifts > 0 { (present as f64 / shifts as f64 * 100.0).round() } else { 0.0 };

        serde_json::json!({
            "id": r.try_get::<i64, _>("id").unwrap_or(0),
            "name": r.try_get::<String, _>("name").unwrap_or_default(),
            "role": r.try_get::<String, _>("role").unwrap_or_default(),
            "days_present": present,
            "total_hours": (hours * 10.0).round() / 10.0,
            "avg_hours_per_day": if present > 0 { (hours / present as f64 * 10.0).round() / 10.0 } else { 0.0 },
            "shifts_assigned": shifts,
            "attendance_rate": attendance_rate,
        })
    }).collect();

    let total_hours: f64 = staff.iter().map(|s| s["total_hours"].as_f64().unwrap_or(0.0)).sum();
    let total_staff = staff.len();

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "staff": staff,
            "total_staff": total_staff,
            "total_hours": (total_hours * 10.0).round() / 10.0,
            "avg_hours_per_staff": if total_staff > 0 { (total_hours / total_staff as f64 * 10.0).round() / 10.0 } else { 0.0 },
        }
    }))
}
