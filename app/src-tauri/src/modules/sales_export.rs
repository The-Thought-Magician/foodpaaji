use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn export_sales_csv(
    pool: State<'_, SqlitePool>,
    from_date: String, to_date: String,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT b.id, b.bill_number, b.subtotal, b.tax_amount, b.discount_amount,
           b.total_amount, b.payment_method, b.payment_status, b.status,
           b.created_at, c.name as customer_name, c.phone as customer_phone
         FROM bills b
         LEFT JOIN customers c ON b.customer_id = c.id
         WHERE b.created_at >= ? AND b.created_at <= ? || ' 23:59:59'
         ORDER BY b.created_at"
    )
    .bind(&from_date).bind(&to_date)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let mut csv = String::from("Bill#,Date,Customer,Phone,Subtotal,Tax,Discount,Total,Payment Method,Status\n");
    for r in &rows {
        let escape = |s: String| {
            if s.contains(',') || s.contains('"') { format!("\"{}\"", s.replace('"', "\"\"")) } else { s }
        };
        csv.push_str(&format!("{},{},{},{},{:.2},{:.2},{:.2},{:.2},{},{}\n",
            escape(r.try_get::<Option<String>, _>("bill_number").unwrap_or(None).unwrap_or_default()),
            r.try_get::<String, _>("created_at").unwrap_or_default(),
            escape(r.try_get::<Option<String>, _>("customer_name").unwrap_or(None).unwrap_or_default()),
            r.try_get::<Option<String>, _>("customer_phone").unwrap_or(None).unwrap_or_default(),
            r.try_get::<f64, _>("subtotal").unwrap_or(0.0),
            r.try_get::<f64, _>("tax_amount").unwrap_or(0.0),
            r.try_get::<f64, _>("discount_amount").unwrap_or(0.0),
            r.try_get::<f64, _>("total_amount").unwrap_or(0.0),
            escape(r.try_get::<Option<String>, _>("payment_method").unwrap_or(None).unwrap_or_default()),
            r.try_get::<String, _>("status").unwrap_or_default(),
        ));
    }

    Ok(serde_json::json!({ "success": true, "data": { "csv": csv, "count": rows.len() } }))
}
