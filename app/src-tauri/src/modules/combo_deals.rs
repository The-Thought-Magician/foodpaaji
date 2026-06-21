use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ComboItem {
    pub id: i64,
    pub menu_item_id: i64,
    pub item_name: String,
    pub item_price: f64,
    pub quantity: i64,
}

#[derive(Debug, Serialize)]
pub struct ComboDeal {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub combo_price: f64,
    pub original_price: f64,
    pub savings: f64,
    pub is_active: bool,
    pub items: Vec<ComboItem>,
}

#[derive(Debug, Deserialize)]
pub struct CreateComboRequest {
    pub name: String,
    pub description: Option<String>,
    pub combo_price: f64,
    pub items: Vec<ComboItemInput>,
}

#[derive(Debug, Deserialize)]
pub struct ComboItemInput {
    pub menu_item_id: i64,
    pub quantity: i64,
}

#[tauri::command]
pub async fn get_combo_deals(db: State<'_, DbPool>) -> Result<ApiResponse<Vec<ComboDeal>>, String> {
    let combos = sqlx::query("SELECT id, name, description, combo_price, original_price, is_active FROM combo_deals ORDER BY created_at DESC")
        .fetch_all(&*db).await.map_err(|e| e.to_string())?;

    let mut deals = Vec::new();
    for row in &combos {
        let id: i64 = row.get("id");
        let combo_price: f64 = row.get("combo_price");
        let original_price: f64 = row.get("original_price");

        let items = sqlx::query(
            "SELECT ci.id, ci.menu_item_id, ci.quantity, m.name as item_name, m.price as item_price
             FROM combo_deal_items ci JOIN menu_items m ON ci.menu_item_id = m.id WHERE ci.combo_id = ?"
        ).bind(id).fetch_all(&*db).await.map_err(|e| e.to_string())?;

        deals.push(ComboDeal {
            id,
            name: row.get("name"),
            description: row.get("description"),
            combo_price,
            original_price,
            savings: original_price - combo_price,
            is_active: row.get::<bool, _>("is_active"),
            items: items.iter().map(|i| ComboItem {
                id: i.get("id"),
                menu_item_id: i.get("menu_item_id"),
                item_name: i.get("item_name"),
                item_price: i.get("item_price"),
                quantity: i.get("quantity"),
            }).collect(),
        });
    }

    Ok(ApiResponse { success: true, data: Some(deals), message: None, error: None })
}

#[tauri::command]
pub async fn create_combo_deal(
    request: CreateComboRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ComboDeal>, String> {
    // Calculate original price from items
    let mut original_price = 0.0;
    for item in &request.items {
        let row = sqlx::query("SELECT price FROM menu_items WHERE id = ?")
            .bind(item.menu_item_id).fetch_optional(&*db).await.map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Menu item {} not found", item.menu_item_id))?;
        let price: f64 = row.get("price");
        original_price += price * item.quantity as f64;
    }

    let result = sqlx::query(
        "INSERT INTO combo_deals (name, description, combo_price, original_price) VALUES (?, ?, ?, ?)"
    )
    .bind(&request.name).bind(&request.description).bind(request.combo_price).bind(original_price)
    .execute(&*db).await.map_err(|e| e.to_string())?;

    let combo_id = result.last_insert_rowid();

    for item in &request.items {
        sqlx::query("INSERT INTO combo_deal_items (combo_id, menu_item_id, quantity) VALUES (?, ?, ?)")
            .bind(combo_id).bind(item.menu_item_id).bind(item.quantity)
            .execute(&*db).await.map_err(|e| e.to_string())?;
    }

    // Return full combo
    let combos = get_combo_deals(db).await?;
    let deal = combos.data.and_then(|d| d.into_iter().find(|c| c.id == combo_id))
        .ok_or_else(|| "Failed to fetch created combo".to_string())?;

    Ok(ApiResponse { success: true, data: Some(deal), message: Some("Combo created".to_string()), error: None })
}

#[tauri::command]
pub async fn toggle_combo_deal(
    combo_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    sqlx::query("UPDATE combo_deals SET is_active = NOT is_active WHERE id = ?")
        .bind(combo_id).execute(&*db).await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { success: true, data: None, message: Some("Toggled".to_string()), error: None })
}

#[tauri::command]
pub async fn delete_combo_deal(
    combo_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    sqlx::query("DELETE FROM combo_deals WHERE id = ?")
        .bind(combo_id).execute(&*db).await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { success: true, data: None, message: Some("Deleted".to_string()), error: None })
}
