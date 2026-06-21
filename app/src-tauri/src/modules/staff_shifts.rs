use sqlx::{SqlitePool, Row};
use tauri::State;

#[tauri::command]
pub async fn create_shift(
    pool: State<'_, SqlitePool>,
    employee_id: i64,
    shift_date: String,
    start_time: String,
    end_time: String,
    role_note: Option<String>,
) -> Result<serde_json::Value, String> {
    let id = sqlx::query(
        "INSERT INTO staff_shifts (employee_id, shift_date, start_time, end_time, role_note) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(employee_id).bind(&shift_date).bind(&start_time).bind(&end_time).bind(&role_note)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?
    .last_insert_rowid();
    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
pub async fn get_shifts(
    pool: State<'_, SqlitePool>,
    from_date: String,
    to_date: String,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT s.id, s.employee_id, e.name as employee_name, e.role, s.shift_date, s.start_time, s.end_time, s.role_note, s.status
         FROM staff_shifts s JOIN employees e ON e.id = s.employee_id
         WHERE s.shift_date BETWEEN ? AND ? ORDER BY s.shift_date, s.start_time"
    )
    .bind(&from_date).bind(&to_date)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let data: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64,_>("id").unwrap_or(0),
        "employee_id": r.try_get::<i64,_>("employee_id").unwrap_or(0),
        "employee_name": r.try_get::<String,_>("employee_name").unwrap_or_default(),
        "role": r.try_get::<String,_>("role").unwrap_or_default(),
        "shift_date": r.try_get::<String,_>("shift_date").unwrap_or_default(),
        "start_time": r.try_get::<String,_>("start_time").unwrap_or_default(),
        "end_time": r.try_get::<String,_>("end_time").unwrap_or_default(),
        "role_note": r.try_get::<Option<String>,_>("role_note").unwrap_or(None),
        "status": r.try_get::<String,_>("status").unwrap_or_default(),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": data }))
}

#[tauri::command]
pub async fn delete_shift(pool: State<'_, SqlitePool>, shift_id: i64) -> Result<serde_json::Value, String> {
    sqlx::query("DELETE FROM staff_shifts WHERE id = ?")
        .bind(shift_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn update_shift_status(pool: State<'_, SqlitePool>, shift_id: i64, status: String) -> Result<serde_json::Value, String> {
    sqlx::query("UPDATE staff_shifts SET status = ? WHERE id = ?")
        .bind(&status).bind(shift_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}
