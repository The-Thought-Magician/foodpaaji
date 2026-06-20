use crate::database::{DbPool, get_app_data_dir};
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use std::path::PathBuf;
use std::fs;
use base64::{Engine as _, engine::general_purpose};
use std::io::Cursor;
use image::GenericImageView;

#[derive(Deserialize)]
pub struct MenuItemImageUploadRequest {
    pub menu_item_id: i64,
    pub restaurant_id: i64,
    pub image_data: String,
    pub file_name: String,
    pub compress: Option<bool>,
    pub max_width: Option<u32>,
    pub max_height: Option<u32>,
    pub quality: Option<u8>,
}

#[derive(Deserialize)]
pub struct MenuCategoryImageUploadRequest {
    pub category_id: i64,
    pub restaurant_id: i64,
    pub image_data: String,
    pub file_name: String,
    pub compress: Option<bool>,
    pub max_width: Option<u32>,
    pub max_height: Option<u32>,
    pub quality: Option<u8>,
}

#[derive(Serialize)]
pub struct ImageUploadResponse {
    pub image_path: String,
    pub compressed: bool,
    pub original_size: u64,
    pub final_size: u64,
}

pub fn compress_image(image_data: &[u8], max_width: u32, max_height: u32, _quality: u8) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(image_data).map_err(|e| format!("Failed to load image: {}", e))?;
    let (width, height) = img.dimensions();
    let final_img = if width > max_width || height > max_height { img.thumbnail(max_width, max_height) } else { img };
    let mut output = Cursor::new(Vec::new());
    final_img.write_to(&mut output, image::ImageFormat::Jpeg).map_err(|e| format!("Failed to compress image: {}", e))?;
    Ok(output.into_inner())
}

pub fn save_image_file(image_data: &[u8], directory: &str, filename: &str) -> Result<(String, PathBuf), String> {
    let app_data_dir = get_app_data_dir().map_err(|e| e.to_string())?;
    let images_dir = app_data_dir.join(directory);
    fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create images directory: {}", e))?;
    let image_path = images_dir.join(filename);
    fs::write(&image_path, image_data).map_err(|e| format!("Failed to save image: {}", e))?;
    Ok((format!("{}/{}", directory, filename), image_path))
}

fn decode_and_compress(image_data: &str, compress: bool, max_width: u32, max_height: u32, quality: u8) -> Result<(Vec<u8>, bool), String> {
    let stripped = image_data
        .replace("data:image/jpeg;base64,", "")
        .replace("data:image/png;base64,", "")
        .replace("data:image/webp;base64,", "");
    let decoded = general_purpose::STANDARD.decode(&stripped).map_err(|e| format!("Invalid base64 data: {}", e))?;
    if compress {
        match compress_image(&decoded, max_width, max_height, quality) {
            Ok(c) => Ok((c, true)),
            Err(_) => Ok((decoded, false)),
        }
    } else {
        Ok((decoded, false))
    }
}

#[tauri::command]
pub async fn upload_menu_item_image(
    request: MenuItemImageUploadRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ImageUploadResponse>, String> {
    let original_size = general_purpose::STANDARD.decode(
        request.image_data.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "").replace("data:image/webp;base64,", "")
    ).map_err(|e| format!("Invalid base64 data: {}", e))?.len() as u64;

    let (final_data, compressed) = decode_and_compress(
        &request.image_data,
        request.compress.unwrap_or(true),
        request.max_width.unwrap_or(800),
        request.max_height.unwrap_or(600),
        request.quality.unwrap_or(85),
    )?;

    let ext = if compressed { "jpg" } else { request.file_name.split('.').last().unwrap_or("jpg") };
    let filename = format!("menu_item_{}_{}.{}", request.menu_item_id, Utc::now().timestamp(), ext);
    let (relative_path, _) = save_image_file(&final_data, "menu_images", &filename)?;

    match sqlx::query("UPDATE menu_items SET image_path = ? WHERE id = ? AND restaurant_id = ?")
        .bind(&relative_path).bind(request.menu_item_id).bind(request.restaurant_id)
        .execute(&*db).await
    {
        Ok(r) if r.rows_affected() > 0 => Ok(ApiResponse {
            success: true,
            data: Some(ImageUploadResponse { image_path: relative_path, compressed, original_size, final_size: final_data.len() as u64 }),
            message: Some("Menu item image uploaded successfully".to_string()), error: None,
        }),
        Ok(_) => Err("Menu item not found or access denied".to_string()),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

#[tauri::command]
pub async fn upload_menu_category_image(
    request: MenuCategoryImageUploadRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ImageUploadResponse>, String> {
    let original_size = general_purpose::STANDARD.decode(
        request.image_data.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "").replace("data:image/webp;base64,", "")
    ).map_err(|e| format!("Invalid base64 data: {}", e))?.len() as u64;

    let (final_data, compressed) = decode_and_compress(
        &request.image_data,
        request.compress.unwrap_or(true),
        request.max_width.unwrap_or(400),
        request.max_height.unwrap_or(300),
        request.quality.unwrap_or(85),
    )?;

    let ext = if compressed { "jpg" } else { request.file_name.split('.').last().unwrap_or("jpg") };
    let filename = format!("menu_category_{}_{}.{}", request.category_id, Utc::now().timestamp(), ext);
    let (relative_path, _) = save_image_file(&final_data, "menu_images", &filename)?;

    match sqlx::query("UPDATE menu_categories SET image_path = ? WHERE id = ? AND restaurant_id = ?")
        .bind(&relative_path).bind(request.category_id).bind(request.restaurant_id)
        .execute(&*db).await
    {
        Ok(r) if r.rows_affected() > 0 => Ok(ApiResponse {
            success: true,
            data: Some(ImageUploadResponse { image_path: relative_path, compressed, original_size, final_size: final_data.len() as u64 }),
            message: Some("Menu category image uploaded successfully".to_string()), error: None,
        }),
        Ok(_) => Err("Menu category not found or access denied".to_string()),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}
