use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::Serialize;
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct MenuRecommendation {
    pub menu_item_id: i64,
    pub item_name: String,
    pub paired_item_id: i64,
    pub paired_item_name: String,
    pub times_ordered_together: i64,
    pub confidence: f64,
}

#[derive(Debug, Serialize)]
pub struct TrendingItem {
    pub menu_item_id: i64,
    pub item_name: String,
    pub order_count: i64,
    pub total_quantity: i64,
}

#[tauri::command]
pub async fn get_frequently_ordered_together(
    menu_item_id: i64,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuRecommendation>>, String> {
    let limit = limit.unwrap_or(5);

    let rows = sqlx::query(
        "SELECT oi2.menu_item_id as paired_id, m.name as paired_name, COUNT(*) as co_count
         FROM order_items oi1
         JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.menu_item_id != oi2.menu_item_id
         JOIN menu_items m ON oi2.menu_item_id = m.id
         WHERE oi1.menu_item_id = ? AND oi2.menu_item_id IS NOT NULL
         GROUP BY oi2.menu_item_id, m.name
         ORDER BY co_count DESC
         LIMIT ?"
    )
    .bind(menu_item_id)
    .bind(limit)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    // Get total orders containing this item for confidence calc
    let total_row = sqlx::query(
        "SELECT COUNT(DISTINCT order_id) as total FROM order_items WHERE menu_item_id = ?"
    )
    .bind(menu_item_id)
    .fetch_one(&*db)
    .await
    .map_err(|e| e.to_string())?;
    let total: i64 = total_row.get("total");

    let source_name_row = sqlx::query("SELECT name FROM menu_items WHERE id = ?")
        .bind(menu_item_id).fetch_optional(&*db).await.map_err(|e| e.to_string())?;
    let source_name: String = source_name_row.map(|r| r.get("name")).unwrap_or_default();

    let recs = rows.iter().map(|r| {
        let co_count: i64 = r.get("co_count");
        let confidence = if total > 0 { co_count as f64 / total as f64 * 100.0 } else { 0.0 };
        MenuRecommendation {
            menu_item_id,
            item_name: source_name.clone(),
            paired_item_id: r.get("paired_id"),
            paired_item_name: r.get("paired_name"),
            times_ordered_together: co_count,
            confidence: (confidence * 10.0).round() / 10.0,
        }
    }).collect();

    Ok(ApiResponse { success: true, data: Some(recs), message: None, error: None })
}

#[tauri::command]
pub async fn get_trending_items(
    days: Option<i64>,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<TrendingItem>>, String> {
    let days = days.unwrap_or(7);
    let limit = limit.unwrap_or(10);

    let rows = sqlx::query(
        "SELECT oi.menu_item_id, m.name as item_name,
           COUNT(DISTINCT oi.order_id) as order_count,
           SUM(oi.quantity) as total_quantity
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN menu_items m ON oi.menu_item_id = m.id
         WHERE o.created_at >= datetime('now', ? || ' days')
           AND oi.menu_item_id IS NOT NULL
         GROUP BY oi.menu_item_id, m.name
         ORDER BY order_count DESC
         LIMIT ?"
    )
    .bind(format!("-{}", days))
    .bind(limit)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    let items = rows.iter().map(|r| TrendingItem {
        menu_item_id: r.get("menu_item_id"),
        item_name: r.get("item_name"),
        order_count: r.get("order_count"),
        total_quantity: r.get("total_quantity"),
    }).collect();

    Ok(ApiResponse { success: true, data: Some(items), message: None, error: None })
}
