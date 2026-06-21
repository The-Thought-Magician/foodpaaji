use crate::database::DbPool;
use crate::types::ApiResponse;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Allergen {
    pub id: i64,
    pub menu_item_id: i64,
    pub allergen_name: String,
    pub severity: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NutritionInfo {
    pub id: i64,
    pub menu_item_id: i64,
    pub serving_size: Option<String>,
    pub calories: i64,
    pub protein: f64,
    pub carbohydrates: f64,
    pub fat: f64,
    pub fiber: f64,
    pub sugar: f64,
    pub sodium: f64,
}

#[derive(Debug, Deserialize)]
pub struct UpsertAllergenRequest {
    pub allergen_name: String,
    pub severity: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertNutritionRequest {
    pub serving_size: Option<String>,
    pub calories: Option<i64>,
    pub protein: Option<f64>,
    pub carbohydrates: Option<f64>,
    pub fat: Option<f64>,
    pub fiber: Option<f64>,
    pub sugar: Option<f64>,
    pub sodium: Option<f64>,
}

#[tauri::command]
pub async fn get_menu_item_allergens(
    menu_item_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<Allergen>>, String> {
    match sqlx::query(
        "SELECT id, menu_item_id, allergen_name, severity, notes FROM menu_item_allergens WHERE menu_item_id = ? ORDER BY allergen_name"
    )
    .bind(menu_item_id).fetch_all(&*db).await {
        Ok(rows) => {
            let allergens = rows.iter().map(|r| Allergen {
                id: r.get("id"), menu_item_id: r.get("menu_item_id"),
                allergen_name: r.get("allergen_name"), severity: r.get("severity"),
                notes: r.get("notes"),
            }).collect();
            Ok(ApiResponse { success: true, data: Some(allergens), message: None, error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn add_allergen(
    menu_item_id: i64,
    request: UpsertAllergenRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Allergen>, String> {
    match sqlx::query(
        "INSERT INTO menu_item_allergens (menu_item_id, allergen_name, severity, notes) VALUES (?, ?, ?, ?)"
    )
    .bind(menu_item_id).bind(&request.allergen_name)
    .bind(request.severity.as_deref().unwrap_or("MEDIUM")).bind(&request.notes)
    .execute(&*db).await {
        Ok(r) => {
            let id = r.last_insert_rowid();
            Ok(ApiResponse { success: true, data: Some(Allergen {
                id, menu_item_id, allergen_name: request.allergen_name,
                severity: request.severity.unwrap_or_else(|| "MEDIUM".to_string()),
                notes: request.notes,
            }), message: Some("Allergen added".to_string()), error: None })
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn remove_allergen(
    allergen_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<()>, String> {
    match sqlx::query("DELETE FROM menu_item_allergens WHERE id = ?")
        .bind(allergen_id).execute(&*db).await {
        Ok(_) => Ok(ApiResponse { success: true, data: None, message: Some("Allergen removed".to_string()), error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn get_nutrition_info(
    menu_item_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Option<NutritionInfo>>, String> {
    match sqlx::query(
        "SELECT id, menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium
         FROM menu_item_nutrition WHERE menu_item_id = ?"
    )
    .bind(menu_item_id).fetch_optional(&*db).await {
        Ok(Some(r)) => Ok(ApiResponse { success: true, data: Some(Some(NutritionInfo {
            id: r.get("id"), menu_item_id: r.get("menu_item_id"),
            serving_size: r.get("serving_size"), calories: r.get("calories"),
            protein: r.get("protein"), carbohydrates: r.get("carbohydrates"),
            fat: r.get("fat"), fiber: r.get("fiber"), sugar: r.get("sugar"), sodium: r.get("sodium"),
        })), message: None, error: None }),
        Ok(None) => Ok(ApiResponse { success: true, data: Some(None), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn upsert_nutrition_info(
    menu_item_id: i64,
    request: UpsertNutritionRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<NutritionInfo>, String> {
    match sqlx::query(
        "INSERT INTO menu_item_nutrition (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(menu_item_id) DO UPDATE SET
           serving_size = excluded.serving_size, calories = excluded.calories,
           protein = excluded.protein, carbohydrates = excluded.carbohydrates,
           fat = excluded.fat, fiber = excluded.fiber, sugar = excluded.sugar,
           sodium = excluded.sodium, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(menu_item_id).bind(&request.serving_size).bind(request.calories.unwrap_or(0))
    .bind(request.protein.unwrap_or(0.0)).bind(request.carbohydrates.unwrap_or(0.0))
    .bind(request.fat.unwrap_or(0.0)).bind(request.fiber.unwrap_or(0.0))
    .bind(request.sugar.unwrap_or(0.0)).bind(request.sodium.unwrap_or(0.0))
    .execute(&*db).await {
        Ok(_) => match sqlx::query(
            "SELECT id, menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium
             FROM menu_item_nutrition WHERE menu_item_id = ?"
        ).bind(menu_item_id).fetch_one(&*db).await {
            Ok(r) => Ok(ApiResponse { success: true, data: Some(NutritionInfo {
                id: r.get("id"), menu_item_id: r.get("menu_item_id"),
                serving_size: r.get("serving_size"), calories: r.get("calories"),
                protein: r.get("protein"), carbohydrates: r.get("carbohydrates"),
                fat: r.get("fat"), fiber: r.get("fiber"), sugar: r.get("sugar"), sodium: r.get("sodium"),
            }), message: Some("Nutrition info saved".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
