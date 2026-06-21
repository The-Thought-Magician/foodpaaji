use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn cancel_bill(
    pool: State<'_, SqlitePool>,
    bill_id: i64, reason: String, performed_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let bill = sqlx::query("SELECT total_amount, status FROM bills WHERE id = ?")
        .bind(bill_id).fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let Some(bill) = bill else {
        return Ok(serde_json::json!({ "success": false, "error": "Bill not found" }));
    };

    let status = bill.try_get::<String, _>("status").unwrap_or_default();
    if status == "cancelled" {
        return Ok(serde_json::json!({ "success": false, "error": "Bill already cancelled" }));
    }

    sqlx::query("UPDATE bills SET status = 'cancelled' WHERE id = ?")
        .bind(bill_id).execute(pool.inner()).await.map_err(|e| e.to_string())?;

    let amount = bill.try_get::<f64, _>("total_amount").unwrap_or(0.0);
    sqlx::query("INSERT INTO bill_refunds (bill_id, refund_amount, reason, performed_by) VALUES (?, ?, ?, ?)")
        .bind(bill_id).bind(amount).bind(&reason).bind(&performed_by)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true, "refund_amount": amount }))
}

#[tauri::command]
pub async fn partial_refund(
    pool: State<'_, SqlitePool>,
    bill_id: i64, refund_amount: f64, reason: String,
    refund_method: Option<String>, performed_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let bill = sqlx::query("SELECT total_amount FROM bills WHERE id = ?")
        .bind(bill_id).fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let Some(bill) = bill else {
        return Ok(serde_json::json!({ "success": false, "error": "Bill not found" }));
    };

    let total = bill.try_get::<f64, _>("total_amount").unwrap_or(0.0);
    if refund_amount > total || refund_amount <= 0.0 {
        return Ok(serde_json::json!({ "success": false, "error": "Invalid refund amount" }));
    }

    sqlx::query("INSERT INTO bill_refunds (bill_id, refund_amount, reason, refund_method, performed_by) VALUES (?, ?, ?, ?, ?)")
        .bind(bill_id).bind(refund_amount).bind(&reason).bind(&refund_method).bind(&performed_by)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_bill_refunds(
    pool: State<'_, SqlitePool>,
    bill_id: Option<i64>, limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(50);
    let rows = if let Some(id) = bill_id {
        sqlx::query("SELECT r.*, b.bill_number FROM bill_refunds r LEFT JOIN bills b ON r.bill_id = b.id WHERE r.bill_id = ? ORDER BY r.created_at DESC LIMIT ?")
            .bind(id).bind(limit).fetch_all(pool.inner()).await
    } else {
        sqlx::query("SELECT r.*, b.bill_number FROM bill_refunds r LEFT JOIN bills b ON r.bill_id = b.id ORDER BY r.created_at DESC LIMIT ?")
            .bind(limit).fetch_all(pool.inner()).await
    }.map_err(|e| e.to_string())?;

    let entries: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "id": r.try_get::<i64, _>("id").unwrap_or(0),
        "bill_id": r.try_get::<i64, _>("bill_id").unwrap_or(0),
        "bill_number": r.try_get::<Option<String>, _>("bill_number").unwrap_or(None),
        "refund_amount": r.try_get::<f64, _>("refund_amount").unwrap_or(0.0),
        "reason": r.try_get::<String, _>("reason").unwrap_or_default(),
        "refund_method": r.try_get::<Option<String>, _>("refund_method").unwrap_or(None),
        "performed_by": r.try_get::<Option<String>, _>("performed_by").unwrap_or(None),
        "created_at": r.try_get::<String, _>("created_at").unwrap_or_default(),
    })).collect();

    Ok(serde_json::json!({ "success": true, "data": entries }))
}
