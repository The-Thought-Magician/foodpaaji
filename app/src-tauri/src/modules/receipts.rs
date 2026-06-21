use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceiptLine {
    pub item_name: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub total: f64,
}

fn format_receipt(bill_number: &str, table: Option<&str>, lines: &[ReceiptLine], subtotal: f64, discount: f64, tax: f64, total: f64, restaurant_name: &str, address: &str, phone: &str, gstin: &str) -> String {
    let mut out = String::new();
    out.push_str("================================\n");
    let name = if restaurant_name.is_empty() { "FOODPAAJI" } else { restaurant_name };
    out.push_str(&format!("{:^32}\n", name));
    if !address.is_empty() { out.push_str(&format!("{:^32}\n", address)); }
    if !phone.is_empty() { out.push_str(&format!("Ph: {}\n", phone)); }
    if !gstin.is_empty() { out.push_str(&format!("GSTIN: {}\n", gstin)); }
    out.push_str("================================\n");
    out.push_str(&format!("Bill: {}\n", bill_number));
    if let Some(t) = table {
        out.push_str(&format!("Table: {}\n", t));
    }
    out.push_str(&format!("Date: {}\n", Local::now().format("%d/%m/%Y %H:%M")));
    out.push_str("--------------------------------\n");
    for line in lines {
        out.push_str(&format!("{:<20} {:>2}x {:>8.2}\n", &line.item_name[..line.item_name.len().min(20)], line.quantity, line.total));
    }
    out.push_str("--------------------------------\n");
    out.push_str(&format!("{:<20} {:>11.2}\n", "Subtotal", subtotal));
    if discount > 0.0 {
        out.push_str(&format!("{:<20} {:>10.2}\n", "Discount", -discount));
    }
    out.push_str(&format!("{:<20} {:>11.2}\n", "Tax", tax));
    out.push_str("================================\n");
    out.push_str(&format!("{:<20} {:>11.2}\n", "TOTAL", total));
    out.push_str("================================\n");
    out.push_str("      Thank you! Visit again\n");
    out
}

#[tauri::command]
pub async fn generate_receipt(pool: State<'_, SqlitePool>, bill_id: i64, restaurant_name: Option<String>, address: Option<String>, phone: Option<String>, gstin: Option<String>) -> Result<serde_json::Value, String> {
    let bill = sqlx::query!(
        "SELECT bill_number, table_number, subtotal, discount_amount, tax_amount, total_amount FROM bills WHERE id = ?",
        bill_id
    )
    .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    let Some(bill) = bill else {
        return Err("Bill not found".to_string());
    };

    let items = sqlx::query!(
        "SELECT item_name, quantity, unit_price, total_price FROM bill_items WHERE bill_id = ?",
        bill_id
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let lines: Vec<ReceiptLine> = items.into_iter().map(|r| ReceiptLine {
        item_name: r.item_name,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total: r.total_price,
    }).collect();

    let rname = restaurant_name.unwrap_or_default();
    let raddr = address.unwrap_or_default();
    let rphone = phone.unwrap_or_default();
    let rgstin = gstin.unwrap_or_default();
    let content = format_receipt(&bill.bill_number, bill.table_number.as_deref(), &lines, bill.subtotal, bill.discount_amount, bill.tax_amount, bill.total_amount, &rname, &raddr, &rphone, &rgstin);

    let receipt_number = format!("REC-{}", Local::now().format("%Y%m%d%H%M%S"));
    let receipt_id = sqlx::query!(
        "INSERT INTO receipts (bill_id, receipt_number, content) VALUES (?, ?, ?)",
        bill_id, receipt_number, content
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?
    .last_insert_rowid();

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "receipt_id": receipt_id,
            "receipt_number": receipt_number,
            "content": content,
            "bill_number": bill.bill_number,
            "total_amount": bill.total_amount,
            "items": lines
        }
    }))
}

#[tauri::command]
pub async fn mark_receipt_printed(pool: State<'_, SqlitePool>, receipt_id: i64) -> Result<serde_json::Value, String> {
    let printed_at = Local::now().to_rfc3339();
    sqlx::query!(
        "UPDATE receipts SET printed_at = ? WHERE id = ?",
        printed_at, receipt_id
    )
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_receipt(pool: State<'_, SqlitePool>, bill_id: i64) -> Result<serde_json::Value, String> {
    let receipt = sqlx::query!(
        "SELECT id, receipt_number, content, printed_at, created_at FROM receipts WHERE bill_id = ? ORDER BY created_at DESC LIMIT 1",
        bill_id
    )
    .fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?;

    match receipt {
        Some(r) => Ok(serde_json::json!({
            "success": true,
            "data": { "id": r.id, "receipt_number": r.receipt_number, "content": r.content, "printed_at": r.printed_at }
        })),
        None => Ok(serde_json::json!({ "success": false, "data": null })),
    }
}
