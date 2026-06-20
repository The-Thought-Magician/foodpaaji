use crate::database::{DbPool, get_app_data_dir};
use crate::types::ApiResponse;
use tauri::State;
use std::fs;
use base64::{Engine as _, engine::general_purpose};

#[tauri::command]
pub async fn get_menu_image(image_path: String) -> Result<ApiResponse<String>, String> {
    let app_data_dir = get_app_data_dir().map_err(|e| e.to_string())?;
    let full_path = app_data_dir.join(&image_path);

    match fs::read(&full_path) {
        Ok(image_data) => {
            let base64_data = general_purpose::STANDARD.encode(&image_data);
            let ext = image_path.split('.').last().unwrap_or("jpg");
            Ok(ApiResponse {
                success: true,
                data: Some(format!("data:image/{};base64,{}", ext, base64_data)),
                message: None, error: None,
            })
        },
        Err(_) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("Image file not found".to_string()) })
    }
}

#[tauri::command]
pub async fn delete_menu_item_image(
    menu_item_id: i64,
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let image_path = sqlx::query_scalar::<_, Option<String>>(
        "SELECT image_path FROM menu_items WHERE id = ? AND restaurant_id = ?"
    )
    .bind(menu_item_id).bind(restaurant_id)
    .fetch_optional(&*db).await
    .map_err(|e| format!("Database error: {}", e))?;

    if let Some(Some(path)) = image_path {
        let app_data_dir = get_app_data_dir().map_err(|e| e.to_string())?;
        let _ = fs::remove_file(app_data_dir.join(&path));
    }

    match sqlx::query("UPDATE menu_items SET image_path = NULL WHERE id = ? AND restaurant_id = ?")
        .bind(menu_item_id).bind(restaurant_id).execute(&*db).await
    {
        Ok(r) if r.rows_affected() > 0 => Ok(ApiResponse {
            success: true, data: Some("Image deleted successfully".to_string()), message: None, error: None,
        }),
        Ok(_) => Err("Menu item not found or access denied".to_string()),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

#[tauri::command]
pub async fn delete_menu_category_image(
    category_id: i64,
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let image_path = sqlx::query_scalar::<_, Option<String>>(
        "SELECT image_path FROM menu_categories WHERE id = ? AND restaurant_id = ?"
    )
    .bind(category_id).bind(restaurant_id)
    .fetch_optional(&*db).await
    .map_err(|e| format!("Database error: {}", e))?;

    if let Some(Some(path)) = image_path {
        let app_data_dir = get_app_data_dir().map_err(|e| e.to_string())?;
        let _ = fs::remove_file(app_data_dir.join(&path));
    }

    match sqlx::query("UPDATE menu_categories SET image_path = NULL WHERE id = ? AND restaurant_id = ?")
        .bind(category_id).bind(restaurant_id).execute(&*db).await
    {
        Ok(r) if r.rows_affected() > 0 => Ok(ApiResponse {
            success: true, data: Some("Image deleted successfully".to_string()), message: None, error: None,
        }),
        Ok(_) => Err("Menu category not found or access denied".to_string()),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}
