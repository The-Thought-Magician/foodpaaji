use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReservationRequest {
    pub customer_name: String,
    pub customer_phone: String,
    pub table_id: Option<i64>,
    pub party_size: i64,
    pub reservation_date: String,
    pub reservation_time: String,
    pub duration_minutes: Option<i64>,
    pub special_requests: Option<String>,
}

#[tauri::command]
pub async fn get_tables(pool: State<'_, SqlitePool>) -> Result<serde_json::Value, String> {
    let rows = sqlx::query!("SELECT id, table_number, capacity, location, is_active FROM tables WHERE is_active = 1 ORDER BY table_number")
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
        .into_iter().map(|r| serde_json::json!({ "id": r.id, "table_number": r.table_number, "capacity": r.capacity, "location": r.location })).collect::<Vec<_>>();
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

#[tauri::command]
pub async fn create_table(pool: State<'_, SqlitePool>, table_number: String, capacity: i64, location: Option<String>) -> Result<serde_json::Value, String> {
    let id = sqlx::query!("INSERT INTO tables (table_number, capacity, location) VALUES (?, ?, ?)", table_number, capacity, location)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?.last_insert_rowid();
    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
pub async fn create_reservation(pool: State<'_, SqlitePool>, request: CreateReservationRequest) -> Result<serde_json::Value, String> {
    let duration = request.duration_minutes.unwrap_or(90);
    let id = sqlx::query!(
        "INSERT INTO reservations (customer_name, customer_phone, table_id, party_size, reservation_date, reservation_time, duration_minutes, special_requests) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        request.customer_name, request.customer_phone, request.table_id, request.party_size,
        request.reservation_date, request.reservation_time, duration, request.special_requests
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?.last_insert_rowid();
    Ok(serde_json::json!({ "success": true, "id": id }))
}

#[tauri::command]
pub async fn get_reservations(pool: State<'_, SqlitePool>, date: Option<String>, status: Option<String>) -> Result<serde_json::Value, String> {
    let rows = match (date, status) {
        (Some(d), Some(s)) => sqlx::query!("SELECT r.id, r.customer_name, r.customer_phone, r.table_id, t.table_number, r.party_size, r.reservation_date, r.reservation_time, r.duration_minutes, r.status, r.special_requests FROM reservations r LEFT JOIN tables t ON r.table_id = t.id WHERE r.reservation_date = ? AND r.status = ? ORDER BY r.reservation_time", d, s)
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "customer_name": r.customer_name, "customer_phone": r.customer_phone, "table_id": r.table_id, "table_number": r.table_number, "party_size": r.party_size, "date": r.reservation_date, "time": r.reservation_time, "duration": r.duration_minutes, "status": r.status, "special_requests": r.special_requests })).collect::<Vec<_>>(),
        (Some(d), None) => sqlx::query!("SELECT r.id, r.customer_name, r.customer_phone, r.table_id, t.table_number, r.party_size, r.reservation_date, r.reservation_time, r.duration_minutes, r.status, r.special_requests FROM reservations r LEFT JOIN tables t ON r.table_id = t.id WHERE r.reservation_date = ? ORDER BY r.reservation_time", d)
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "customer_name": r.customer_name, "customer_phone": r.customer_phone, "table_id": r.table_id, "table_number": r.table_number, "party_size": r.party_size, "date": r.reservation_date, "time": r.reservation_time, "duration": r.duration_minutes, "status": r.status, "special_requests": r.special_requests })).collect::<Vec<_>>(),
        _ => sqlx::query!("SELECT r.id, r.customer_name, r.customer_phone, r.table_id, t.table_number, r.party_size, r.reservation_date, r.reservation_time, r.duration_minutes, r.status, r.special_requests FROM reservations r LEFT JOIN tables t ON r.table_id = t.id ORDER BY r.reservation_date DESC, r.reservation_time LIMIT 100")
            .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
            .into_iter().map(|r| serde_json::json!({ "id": r.id, "customer_name": r.customer_name, "customer_phone": r.customer_phone, "table_id": r.table_id, "table_number": r.table_number, "party_size": r.party_size, "date": r.reservation_date, "time": r.reservation_time, "duration": r.duration_minutes, "status": r.status, "special_requests": r.special_requests })).collect::<Vec<_>>(),
    };
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

#[tauri::command]
pub async fn update_reservation_status(pool: State<'_, SqlitePool>, reservation_id: i64, status: String) -> Result<serde_json::Value, String> {
    sqlx::query!("UPDATE reservations SET status = ?, updated_at = datetime('now') WHERE id = ?", status, reservation_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn update_reservation(pool: State<'_, SqlitePool>, reservation_id: i64, request: CreateReservationRequest) -> Result<serde_json::Value, String> {
    let duration = request.duration_minutes.unwrap_or(90);
    sqlx::query!(
        "UPDATE reservations SET customer_name = ?, customer_phone = ?, table_id = ?, party_size = ?, reservation_date = ?, reservation_time = ?, duration_minutes = ?, special_requests = ?, updated_at = datetime('now') WHERE id = ?",
        request.customer_name, request.customer_phone, request.table_id, request.party_size,
        request.reservation_date, request.reservation_time, duration, request.special_requests, reservation_id
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_table_availability(pool: State<'_, SqlitePool>, date: String, time: String) -> Result<serde_json::Value, String> {
    let occupied: Vec<i64> = sqlx::query!(
        "SELECT DISTINCT table_id FROM reservations WHERE reservation_date = ? AND reservation_time BETWEEN time(?, '-90 minutes') AND time(?, '+90 minutes') AND status NOT IN ('cancelled', 'no_show') AND table_id IS NOT NULL",
        date, time, time
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
    .into_iter().filter_map(|r| r.table_id).collect();

    let tables = sqlx::query!("SELECT id, table_number, capacity, location FROM tables WHERE is_active = 1 ORDER BY capacity")
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
        .into_iter().map(|r| serde_json::json!({ "id": r.id, "table_number": r.table_number, "capacity": r.capacity, "location": r.location, "available": !occupied.contains(&r.id) })).collect::<Vec<_>>();

    Ok(serde_json::json!({ "success": true, "data": tables }))
}
