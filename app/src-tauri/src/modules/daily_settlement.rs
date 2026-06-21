use crate::types::ApiResponse;
use serde::Serialize;
use sqlx::{Row, SqlitePool};
use tauri::State;

#[derive(Debug, Serialize)]
pub struct PaymentMethodBreakdown {
    pub method: String,
    pub transaction_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct DailySettlement {
    pub date: String,
    pub total_bills: i64,
    pub paid_bills: i64,
    pub cancelled_bills: i64,
    pub gross_sales: f64,
    pub total_discount: f64,
    pub total_tax: f64,
    pub net_revenue: f64,
    pub cash_total: f64,
    pub upi_total: f64,
    pub card_total: f64,
    pub other_total: f64,
    pub payment_breakdown: Vec<PaymentMethodBreakdown>,
    pub avg_bill_value: f64,
    pub peak_hour: i64,
    pub opening_cash: f64,
    pub expected_closing_cash: f64,
}

#[tauri::command]
pub async fn get_daily_settlement(
    date: Option<String>,
    db: State<'_, SqlitePool>,
) -> Result<ApiResponse<DailySettlement>, String> {
    let target_date = date.unwrap_or_else(|| {
        let now = chrono::Local::now();
        now.format("%Y-%m-%d").to_string()
    });

    let summary = sqlx::query(
        "SELECT
           COUNT(*) as total_bills,
           SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_bills,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bills,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN subtotal ELSE 0 END), 0) as gross_sales,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN discount_amount ELSE 0 END), 0) as total_discount,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN tax_amount ELSE 0 END), 0) as total_tax,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as net_revenue
         FROM bills
         WHERE date(created_at) = ?"
    )
    .bind(&target_date)
    .fetch_one(&*db)
    .await
    .map_err(|e| e.to_string())?;

    let payment_rows = sqlx::query(
        "SELECT p.method,
           COUNT(*) as transaction_count,
           COALESCE(SUM(p.amount), 0) as total_amount
         FROM payments p
         JOIN bills b ON p.bill_id = b.id
         WHERE p.status = 'completed' AND date(p.paid_at) = ?
         GROUP BY p.method"
    )
    .bind(&target_date)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    let breakdown: Vec<PaymentMethodBreakdown> = payment_rows.iter().map(|r| PaymentMethodBreakdown {
        method: r.get("method"),
        transaction_count: r.get("transaction_count"),
        total_amount: r.get("total_amount"),
    }).collect();

    let cash_total: f64 = breakdown.iter().filter(|b| b.method == "cash").map(|b| b.total_amount).sum();
    let upi_total: f64 = breakdown.iter().filter(|b| b.method == "upi").map(|b| b.total_amount).sum();
    let card_total: f64 = breakdown.iter().filter(|b| b.method == "card").map(|b| b.total_amount).sum();
    let other_total: f64 = breakdown.iter().filter(|b| b.method != "cash" && b.method != "upi" && b.method != "card").map(|b| b.total_amount).sum();

    let peak_hour_row = sqlx::query(
        "SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as cnt
         FROM bills WHERE date(created_at) = ? AND status = 'paid'
         GROUP BY hour ORDER BY cnt DESC LIMIT 1"
    )
    .bind(&target_date)
    .fetch_optional(&*db)
    .await
    .unwrap_or(None);

    let peak_hour: i64 = peak_hour_row.as_ref().map(|r| r.get("hour")).unwrap_or(19);

    let paid_bills: i64 = summary.get("paid_bills");
    let net_revenue: f64 = summary.get("net_revenue");
    let avg_bill = if paid_bills > 0 { net_revenue / paid_bills as f64 } else { 0.0 };

    Ok(ApiResponse {
        success: true,
        data: Some(DailySettlement {
            date: target_date,
            total_bills: summary.get("total_bills"),
            paid_bills,
            cancelled_bills: summary.get("cancelled_bills"),
            gross_sales: summary.get("gross_sales"),
            total_discount: summary.get("total_discount"),
            total_tax: summary.get("total_tax"),
            net_revenue,
            cash_total,
            upi_total,
            card_total,
            other_total,
            payment_breakdown: breakdown,
            avg_bill_value: (avg_bill * 100.0).round() / 100.0,
            peak_hour,
            opening_cash: 0.0,
            expected_closing_cash: cash_total,
        }),
        message: None,
        error: None,
    })
}
