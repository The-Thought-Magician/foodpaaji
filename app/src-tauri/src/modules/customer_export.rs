use sqlx::{SqlitePool, Row};
use tauri::State;

#[tauri::command]
pub async fn export_customers_csv(
    pool: State<'_, SqlitePool>,
) -> Result<serde_json::Value, String> {
    let rows = sqlx::query(
        "SELECT name, phone, email, address, notes, loyalty_points, total_orders, total_spent, created_at FROM customers ORDER BY name"
    )
    .fetch_all(pool.inner()).await.map_err(|e| e.to_string())?;

    let mut csv = String::from("Name,Phone,Email,Address,Notes,Loyalty Points,Total Orders,Total Spent,Created At\n");
    for r in &rows {
        let name: String = r.try_get("name").unwrap_or_default();
        let phone: String = r.try_get::<Option<String>, _>("phone").unwrap_or(None).unwrap_or_default();
        let email: String = r.try_get::<Option<String>, _>("email").unwrap_or(None).unwrap_or_default();
        let address: String = r.try_get::<Option<String>, _>("address").unwrap_or(None).unwrap_or_default();
        let notes: String = r.try_get::<Option<String>, _>("notes").unwrap_or(None).unwrap_or_default();
        let loyalty: i64 = r.try_get("loyalty_points").unwrap_or(0);
        let orders: i64 = r.try_get("total_orders").unwrap_or(0);
        let spent: f64 = r.try_get("total_spent").unwrap_or(0.0);
        let created: String = r.try_get("created_at").unwrap_or_default();

        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",{},{},{:.2},{}\n",
            csv_escape(&name), csv_escape(&phone), csv_escape(&email),
            csv_escape(&address), csv_escape(&notes), loyalty, orders, spent, created
        ));
    }

    Ok(serde_json::json!({ "success": true, "data": csv, "count": rows.len() }))
}

#[tauri::command]
pub async fn import_customers_csv(
    pool: State<'_, SqlitePool>,
    csv_data: String,
) -> Result<serde_json::Value, String> {
    let lines: Vec<&str> = csv_data.lines().collect();
    if lines.len() < 2 { return Err("CSV must have header + at least one row".to_string()); }

    let mut imported = 0i64;
    let mut skipped = 0i64;

    for line in &lines[1..] {
        let fields = parse_csv_line(line);
        if fields.len() < 2 { skipped += 1; continue; }

        let name = fields[0].trim();
        if name.is_empty() { skipped += 1; continue; }

        let phone = fields.get(1).map(|s| s.trim()).filter(|s| !s.is_empty());
        let email = fields.get(2).map(|s| s.trim()).filter(|s| !s.is_empty());
        let address = fields.get(3).map(|s| s.trim()).filter(|s| !s.is_empty());
        let notes = fields.get(4).map(|s| s.trim()).filter(|s| !s.is_empty());

        let exists = if let Some(ph) = phone {
            sqlx::query("SELECT id FROM customers WHERE phone = ?")
                .bind(ph).fetch_optional(pool.inner()).await.map_err(|e| e.to_string())?.is_some()
        } else { false };

        if exists { skipped += 1; continue; }

        sqlx::query(
            "INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(name).bind(phone).bind(email).bind(address).bind(notes)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;

        imported += 1;
    }

    Ok(serde_json::json!({ "success": true, "imported": imported, "skipped": skipped }))
}

fn csv_escape(s: &str) -> String {
    s.replace('"', "\"\"")
}

fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(c) = chars.next() {
        if in_quotes {
            if c == '"' {
                if chars.peek() == Some(&'"') { chars.next(); current.push('"'); }
                else { in_quotes = false; }
            } else { current.push(c); }
        } else if c == '"' { in_quotes = true; }
        else if c == ',' { fields.push(std::mem::take(&mut current)); }
        else { current.push(c); }
    }
    fields.push(current);
    fields
}
