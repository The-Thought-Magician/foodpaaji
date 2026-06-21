use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MenuItemVariant {
    pub id: i64,
    pub menu_item_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub price_modifier: f64,
    pub sort_order: i64,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModifierOption {
    pub id: i64,
    pub modifier_id: i64,
    pub name: String,
    pub price_modifier: f64,
    pub is_active: bool,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MenuItemModifier {
    pub id: i64,
    pub menu_item_id: i64,
    pub name: String,
    pub modifier_type: String,
    pub min_selections: i64,
    pub max_selections: i64,
    pub is_active: bool,
    pub sort_order: i64,
    pub options: Vec<ModifierOption>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVariantRequest {
    pub name: String,
    pub description: Option<String>,
    pub price_modifier: Option<f64>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModifierRequest {
    pub name: String,
    pub modifier_type: Option<String>,
    pub min_selections: Option<i64>,
    pub max_selections: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModifierOptionRequest {
    pub name: String,
    pub price_modifier: Option<f64>,
    pub sort_order: Option<i64>,
}

fn row_to_variant(r: &sqlx::sqlite::SqliteRow) -> MenuItemVariant {
    MenuItemVariant {
        id: r.get("id"), menu_item_id: r.get("menu_item_id"), name: r.get("name"),
        description: r.get("description"), price_modifier: r.get("price_modifier"),
        sort_order: r.get("sort_order"), is_active: r.get("is_active"),
    }
}

fn row_to_option(r: &sqlx::sqlite::SqliteRow) -> ModifierOption {
    ModifierOption {
        id: r.get("id"), modifier_id: r.get("modifier_id"), name: r.get("name"),
        price_modifier: r.get("price_modifier"), is_active: r.get("is_active"), sort_order: r.get("sort_order"),
    }
}

#[tauri::command]
pub async fn get_menu_item_variants(
    menu_item_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuItemVariant>>, String> {
    match sqlx::query(
        "SELECT id, menu_item_id, name, description, price_modifier, sort_order, is_active
         FROM menu_item_variants WHERE menu_item_id = ? ORDER BY sort_order, name"
    ).bind(menu_item_id).fetch_all(&*db).await {
        Ok(rows) => Ok(ApiResponse { success: true, data: Some(rows.iter().map(row_to_variant).collect()), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn create_menu_item_variant(
    menu_item_id: i64,
    request: CreateVariantRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItemVariant>, String> {
    match sqlx::query(
        "INSERT INTO menu_item_variants (menu_item_id, name, description, price_modifier, sort_order) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(menu_item_id).bind(&request.name).bind(&request.description)
    .bind(request.price_modifier.unwrap_or(0.0)).bind(request.sort_order.unwrap_or(0))
    .execute(&*db).await {
        Ok(r) => match sqlx::query(
            "SELECT id, menu_item_id, name, description, price_modifier, sort_order, is_active FROM menu_item_variants WHERE id = ?"
        ).bind(r.last_insert_rowid()).fetch_one(&*db).await {
            Ok(row) => Ok(ApiResponse { success: true, data: Some(row_to_variant(&row)), message: Some("Variant created".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn delete_menu_item_variant(
    variant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query("DELETE FROM menu_item_variants WHERE id = ?").bind(variant_id).execute(&*db).await {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Variant deleted".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_menu_item_modifiers(
    menu_item_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<MenuItemModifier>>, String> {
    let mods = match sqlx::query(
        "SELECT id, menu_item_id, name, type as modifier_type, min_selections, max_selections, is_active, sort_order
         FROM menu_item_modifiers WHERE menu_item_id = ? AND is_active = 1 ORDER BY sort_order, name"
    ).bind(menu_item_id).fetch_all(&*db).await {
        Ok(rows) => rows,
        Err(e) => return Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    };

    let mut result = Vec::new();
    for m in &mods {
        let mid: i64 = m.get("id");
        let options = sqlx::query(
            "SELECT id, modifier_id, name, price_modifier, is_active, sort_order FROM menu_item_modifier_options WHERE modifier_id = ? ORDER BY sort_order, name"
        ).bind(mid).fetch_all(&*db).await.unwrap_or_default();
        result.push(MenuItemModifier {
            id: mid, menu_item_id: m.get("menu_item_id"), name: m.get("name"),
            modifier_type: m.get("modifier_type"), min_selections: m.get("min_selections"),
            max_selections: m.get("max_selections"), is_active: m.get("is_active"),
            sort_order: m.get("sort_order"), options: options.iter().map(row_to_option).collect(),
        });
    }
    Ok(ApiResponse { success: true, data: Some(result), message: None, error: None })
}

#[tauri::command]
pub async fn create_menu_item_modifier(
    menu_item_id: i64,
    request: CreateModifierRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<MenuItemModifier>, String> {
    match sqlx::query(
        "INSERT INTO menu_item_modifiers (menu_item_id, name, type, min_selections, max_selections) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(menu_item_id).bind(&request.name)
    .bind(request.modifier_type.as_deref().unwrap_or("OPTIONAL"))
    .bind(request.min_selections.unwrap_or(0)).bind(request.max_selections.unwrap_or(1))
    .execute(&*db).await {
        Ok(r) => {
            let id = r.last_insert_rowid();
            Ok(ApiResponse { success: true, data: Some(MenuItemModifier {
                id, menu_item_id, name: request.name,
                modifier_type: request.modifier_type.unwrap_or_else(|| "OPTIONAL".to_string()),
                min_selections: request.min_selections.unwrap_or(0),
                max_selections: request.max_selections.unwrap_or(1),
                is_active: true, sort_order: 0, options: vec![],
            }), message: Some("Modifier created".to_string()), error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn add_modifier_option(
    modifier_id: i64,
    request: CreateModifierOptionRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ModifierOption>, String> {
    match sqlx::query(
        "INSERT INTO menu_item_modifier_options (modifier_id, name, price_modifier, sort_order) VALUES (?, ?, ?, ?)"
    )
    .bind(modifier_id).bind(&request.name)
    .bind(request.price_modifier.unwrap_or(0.0)).bind(request.sort_order.unwrap_or(0))
    .execute(&*db).await {
        Ok(r) => Ok(ApiResponse { success: true, data: Some(ModifierOption {
            id: r.last_insert_rowid(), modifier_id, name: request.name,
            price_modifier: request.price_modifier.unwrap_or(0.0), is_active: true,
            sort_order: request.sort_order.unwrap_or(0),
        }), message: Some("Option added".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn delete_modifier_option(
    option_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query("DELETE FROM menu_item_modifier_options WHERE id = ?").bind(option_id).execute(&*db).await {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Option removed".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn delete_menu_item_modifier(
    modifier_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query("DELETE FROM menu_item_modifiers WHERE id = ?").bind(modifier_id).execute(&*db).await {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Modifier deleted".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
