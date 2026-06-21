use sqlx::{SqlitePool, Row};
use tauri::State;

#[tauri::command]
pub async fn export_menu_html(
    pool: State<'_, SqlitePool>,
    restaurant_id: i64,
) -> Result<serde_json::Value, String> {
    let categories = sqlx::query(
        "SELECT id, name, description FROM menu_categories WHERE restaurant_id = ? ORDER BY name"
    )
    .bind(restaurant_id)
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let mut html = String::from(
        r#"<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;color:#222}
h1{text-align:center;border-bottom:2px solid #333;padding-bottom:12px}
h2{color:#444;margin-top:32px;border-bottom:1px solid #ccc;padding-bottom:6px}
.item{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted #ddd}
.item-name{font-weight:600}.item-price{white-space:nowrap}
.item-desc{font-size:0.85em;color:#666;margin-bottom:4px}
.veg{color:#2e7d32}.non-veg{color:#c62828}
@media print{body{padding:20px}h1{font-size:1.4em}h2{font-size:1.1em}}
</style></head><body><h1>Menu</h1>"#
    );

    for cat in &categories {
        let cat_id: i64 = cat.try_get("id").unwrap_or(0);
        let cat_name: String = cat.try_get("name").unwrap_or_default();

        html.push_str(&format!("<h2>{}</h2>", html_escape(&cat_name)));

        let items = sqlx::query(
            "SELECT name, description, price, is_vegetarian FROM menu_items WHERE category_id = ? AND is_available = 1 ORDER BY name"
        )
        .bind(cat_id)
        .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

        for item in &items {
            let name: String = item.try_get("name").unwrap_or_default();
            let desc: Option<String> = item.try_get("description").unwrap_or(None);
            let price: f64 = item.try_get("price").unwrap_or(0.0);
            let veg: bool = item.try_get::<i32, _>("is_vegetarian").unwrap_or(0) == 1;

            let veg_label = if veg { r#"<span class="veg">●</span>"# } else { r#"<span class="non-veg">●</span>"# };

            if let Some(d) = &desc {
                if !d.is_empty() {
                    html.push_str(&format!(r#"<div class="item-desc">{}</div>"#, html_escape(d)));
                }
            }
            html.push_str(&format!(
                r#"<div class="item"><span class="item-name">{} {}</span><span class="item-price">₹{:.2}</span></div>"#,
                veg_label, html_escape(&name), price
            ));
        }
    }

    html.push_str("</body></html>");

    Ok(serde_json::json!({ "success": true, "data": html }))
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}
