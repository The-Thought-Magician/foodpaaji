use sqlx::SqlitePool;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn export_inventory_csv(
    pool: State<'_, SqlitePool>,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT i.name, i.sku, ic.name as category, i.unit, i.current_stock,
           i.minimum_stock, i.maximum_stock, i.reorder_point,
           i.cost_price, i.selling_price, i.location
         FROM inventory_items i
         LEFT JOIN inventory_categories ic ON i.category_id = ic.id
         ORDER BY ic.name, i.name"
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let mut csv = String::from("Name,SKU,Category,Unit,Current Stock,Min Stock,Max Stock,Reorder Point,Cost Price,Selling Price,Location\n");
    for r in &rows {
        let escape = |s: String| {
            if s.contains(',') || s.contains('"') { format!("\"{}\"", s.replace('"', "\"\"")) } else { s }
        };
        csv.push_str(&format!("{},{},{},{},{},{},{},{},{},{},{}\n",
            escape(r.try_get::<String, _>("name").unwrap_or_default()),
            escape(r.try_get::<Option<String>, _>("sku").unwrap_or(None).unwrap_or_default()),
            escape(r.try_get::<Option<String>, _>("category").unwrap_or(None).unwrap_or_default()),
            escape(r.try_get::<String, _>("unit").unwrap_or_default()),
            r.try_get::<f64, _>("current_stock").unwrap_or(0.0),
            r.try_get::<f64, _>("minimum_stock").unwrap_or(0.0),
            r.try_get::<f64, _>("maximum_stock").unwrap_or(0.0),
            r.try_get::<f64, _>("reorder_point").unwrap_or(0.0),
            r.try_get::<f64, _>("cost_price").unwrap_or(0.0),
            r.try_get::<f64, _>("selling_price").unwrap_or(0.0),
            escape(r.try_get::<Option<String>, _>("location").unwrap_or(None).unwrap_or_default()),
        ));
    }

    Ok(serde_json::json!({ "success": true, "data": { "csv": csv, "count": rows.len() } }))
}
