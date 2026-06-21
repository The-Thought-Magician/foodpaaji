use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use tauri::State;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BillItem {
    pub menu_item_id: Option<i64>,
    pub item_name: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBillRequest {
    pub customer_id: Option<i64>,
    pub table_number: Option<String>,
    pub items: Vec<BillItem>,
    pub discount_percent: f64,
    pub tax_percent: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Bill {
    pub id: i64,
    pub bill_number: String,
    pub customer_id: Option<i64>,
    pub table_number: Option<String>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub discount_percent: f64,
    pub tax_amount: f64,
    pub tax_percent: f64,
    pub total_amount: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

fn generate_bill_number() -> String {
    let now = Local::now();
    format!("BILL-{}", now.format("%Y%m%d%H%M%S"))
}

#[tauri::command]
pub async fn create_bill(pool: State<'_, SqlitePool>, request: CreateBillRequest) -> Result<serde_json::Value, String> {
    let bill_number = generate_bill_number();
    let subtotal: f64 = request.items.iter().map(|i| {
        (i.unit_price * i.quantity as f64) - i.discount_amount
    }).sum();
    let discount_amount = subtotal * request.discount_percent / 100.0;
    let taxable = subtotal - discount_amount;
    let tax_amount = taxable * request.tax_percent / 100.0;
    let total_amount = taxable + tax_amount;

    let bill_id = sqlx::query!(
        "INSERT INTO bills (bill_number, customer_id, table_number, subtotal, discount_amount, discount_percent, tax_amount, tax_percent, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        bill_number, request.customer_id, request.table_number, subtotal, discount_amount, request.discount_percent, tax_amount, request.tax_percent, total_amount, request.notes
    )
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    for item in &request.items {
        let total_price = (item.unit_price * item.quantity as f64) - item.discount_amount;
        sqlx::query!(
            "INSERT INTO bill_items (bill_id, menu_item_id, item_name, quantity, unit_price, discount_amount, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            bill_id, item.menu_item_id, item.item_name, item.quantity, item.unit_price, item.discount_amount, total_price, item.notes
        )
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({ "success": true, "bill_id": bill_id, "bill_number": bill_number, "total_amount": total_amount }))
}

#[tauri::command]
pub async fn get_bills(pool: State<'_, SqlitePool>, status: Option<String>, customer_id: Option<i64>, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let limit = limit.unwrap_or(50);
    let sql_base = "SELECT b.id, b.bill_number, b.customer_id, c.name as customer_name, b.table_number, b.subtotal, b.discount_amount, b.tax_amount, b.total_amount, b.status, b.created_at FROM bills b LEFT JOIN customers c ON b.customer_id = c.id";
    let rows = match (status.as_deref(), customer_id) {
        (Some(s), Some(cid)) => sqlx::query(&format!("{} WHERE b.status = ? AND b.customer_id = ? ORDER BY b.created_at DESC LIMIT ?", sql_base))
            .bind(s).bind(cid).bind(limit).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?,
        (Some(s), None) => sqlx::query(&format!("{} WHERE b.status = ? ORDER BY b.created_at DESC LIMIT ?", sql_base))
            .bind(s).bind(limit).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?,
        (None, Some(cid)) => sqlx::query(&format!("{} WHERE b.customer_id = ? ORDER BY b.created_at DESC LIMIT ?", sql_base))
            .bind(cid).bind(limit).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?,
        (None, None) => sqlx::query(&format!("{} ORDER BY b.created_at DESC LIMIT ?", sql_base))
            .bind(limit).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?,
    };
    let data: Vec<serde_json::Value> = rows.into_iter().map(|r| {
        let customer_name: Option<String> = r.try_get("customer_name").ok();
        serde_json::json!({ "id": r.try_get::<i64,_>("id").unwrap_or(0), "bill_number": r.try_get::<String,_>("bill_number").unwrap_or_default(), "customer_id": r.try_get::<Option<i64>,_>("customer_id").unwrap_or(None), "customer_name": customer_name, "table_number": r.try_get::<Option<String>,_>("table_number").unwrap_or(None), "subtotal": r.try_get::<f64,_>("subtotal").unwrap_or(0.0), "discount_amount": r.try_get::<f64,_>("discount_amount").unwrap_or(0.0), "tax_amount": r.try_get::<f64,_>("tax_amount").unwrap_or(0.0), "total_amount": r.try_get::<f64,_>("total_amount").unwrap_or(0.0), "status": r.try_get::<String,_>("status").unwrap_or_default(), "created_at": r.try_get::<String,_>("created_at").unwrap_or_default() })
    }).collect();
    Ok(serde_json::json!({ "success": true, "data": data }))
}

#[tauri::command]
pub async fn get_bill_details(pool: State<'_, SqlitePool>, bill_id: i64) -> Result<serde_json::Value, String> {
    let bill = sqlx::query!("SELECT id, bill_number, customer_id, table_number, subtotal, discount_amount, discount_percent, tax_amount, tax_percent, total_amount, status, notes, created_at FROM bills WHERE id = ?", bill_id)
        .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let Some(bill) = bill else {
        return Err("Bill not found".to_string());
    };

    let items = sqlx::query!("SELECT id, menu_item_id, item_name, quantity, unit_price, discount_amount, total_price, notes FROM bill_items WHERE bill_id = ?", bill_id)
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
        .into_iter().map(|r| serde_json::json!({ "id": r.id, "menu_item_id": r.menu_item_id, "item_name": r.item_name, "quantity": r.quantity, "unit_price": r.unit_price, "total_price": r.total_price })).collect::<Vec<_>>();

    let payments = sqlx::query!("SELECT id, amount, method, upi_reference, status, paid_at FROM payments WHERE bill_id = ?", bill_id)
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?
        .into_iter().map(|r| serde_json::json!({ "id": r.id, "amount": r.amount, "method": r.method, "upi_reference": r.upi_reference, "status": r.status, "paid_at": r.paid_at })).collect::<Vec<_>>();

    Ok(serde_json::json!({ "success": true, "data": { "id": bill.id, "bill_number": bill.bill_number, "table_number": bill.table_number, "subtotal": bill.subtotal, "discount_amount": bill.discount_amount, "tax_amount": bill.tax_amount, "total_amount": bill.total_amount, "status": bill.status, "items": items, "payments": payments } }))
}

#[tauri::command]
pub async fn update_bill_status(pool: State<'_, SqlitePool>, bill_id: i64, status: String) -> Result<serde_json::Value, String> {
    sqlx::query!("UPDATE bills SET status = ?, updated_at = datetime('now') WHERE id = ?", status, bill_id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn record_payment(pool: State<'_, SqlitePool>, bill_id: i64, amount: f64, method: String, upi_reference: Option<String>, upi_app: Option<String>) -> Result<serde_json::Value, String> {
    let paid_at = Local::now().to_rfc3339();
    let payment_id = sqlx::query!(
        "INSERT INTO payments (bill_id, amount, method, upi_reference, upi_app, status, paid_at) VALUES (?, ?, ?, ?, ?, 'completed', ?)",
        bill_id, amount, method, upi_reference, upi_app, paid_at
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?
    .last_insert_rowid();

    let bill = sqlx::query!("SELECT total_amount FROM bills WHERE id = ?", bill_id)
        .fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;
    let paid: f64 = sqlx::query!("SELECT COALESCE(SUM(amount), 0.0) as total FROM payments WHERE bill_id = ? AND status = 'completed'", bill_id)
        .fetch_one(pool.inner()).await.map_err(|e| e.to_string())?.total;

    let bill_paid = paid >= bill.total_amount;
    if bill_paid {
        sqlx::query!("UPDATE bills SET status = 'paid', updated_at = datetime('now') WHERE id = ?", bill_id)
            .execute(pool.inner()).await.map_err(|e| e.to_string())?;
        let full_bill = sqlx::query("SELECT customer_id, total_amount FROM bills WHERE id = ?")
            .bind(bill_id).fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;
        let cid: Option<i64> = full_bill.try_get("customer_id").ok();
        let total: f64 = full_bill.try_get("total_amount").unwrap_or(0.0);
        if let Some(cid) = cid {
            let points = (total / 10.0) as i64;
            if points > 0 {
                sqlx::query("UPDATE customers SET loyalty_points = loyalty_points + ?, total_spent = total_spent + ?, visit_count = visit_count + 1, updated_at = datetime('now') WHERE id = ?")
                    .bind(points).bind(total).bind(cid)
                    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(serde_json::json!({ "success": true, "payment_id": payment_id, "bill_paid": bill_paid }))
}

#[tauri::command]
pub async fn get_billing_summary(pool: State<'_, SqlitePool>) -> Result<serde_json::Value, String> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let summary = sqlx::query!(
        "SELECT COUNT(*) as total_bills, COALESCE(SUM(total_amount), 0.0) as total_revenue, COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END), 0.0) as collected FROM bills WHERE date(created_at) = ?",
        today
    ).fetch_one(pool.inner()).await.map_err(|e| e.to_string())?;

    let pmts = sqlx::query("SELECT method, COALESCE(SUM(amount), 0.0) as total FROM payments WHERE date(paid_at) = ? AND status = 'completed' GROUP BY method")
        .bind(&today).fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;
    let (mut cash, mut upi, mut card) = (0.0f64, 0.0f64, 0.0f64);
    for r in &pmts {
        let m: String = r.try_get("method").unwrap_or_default();
        let t: f64 = r.try_get("total").unwrap_or(0.0);
        match m.as_str() { "cash" => cash = t, "upi" => upi = t, "card" => card = t, _ => {} }
    }
    Ok(serde_json::json!({ "success": true, "data": { "today_bills": summary.total_bills, "today_revenue": summary.total_revenue, "today_collected": summary.collected, "cash_collected": cash, "upi_collected": upi, "card_collected": card } }))
}

#[tauri::command]
pub async fn get_payment_method_summary(pool: State<'_, SqlitePool>, from_date: String, to_date: String) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT p.method, SUM(p.amount) as total, COUNT(DISTINCT p.bill_id) as bill_count
         FROM payments p
         JOIN bills b ON p.bill_id = b.id
         WHERE p.status = 'completed' AND b.status = 'paid'
           AND date(b.created_at) BETWEEN ? AND ?
         GROUP BY p.method"
    )
    .bind(&from_date).bind(&to_date)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let mut methods: std::collections::HashMap<String, serde_json::Value> = std::collections::HashMap::new();
    for r in rows {
        use sqlx::Row;
        let method: String = r.try_get("method").unwrap_or_default();
        let total: f64 = r.try_get("total").unwrap_or(0.0);
        let count: i64 = r.try_get("bill_count").unwrap_or(0);
        methods.insert(method, serde_json::json!({ "total": total, "count": count }));
    }
    Ok(serde_json::json!({ "success": true, "data": methods }))
}
