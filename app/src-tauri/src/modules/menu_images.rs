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
use sqlx::Row;

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

fn compress_image(
    image_data: &[u8],
    max_width: u32,
    max_height: u32,
    quality: u8,
) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(image_data)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let (width, height) = img.dimensions();
    let should_resize = width > max_width || height > max_height;

    let final_img = if should_resize {
        img.thumbnail(max_width, max_height)
    } else {
        img
    };

    let mut output = Cursor::new(Vec::new());

    final_img.write_to(&mut output, image::ImageFormat::Jpeg)
        .map_err(|e| format!("Failed to compress image: {}", e))?;

    Ok(output.into_inner())
}

fn save_image_file(
    image_data: &[u8],
    directory: &str,
    filename: &str,
) -> Result<(String, PathBuf), String> {
    let app_data_dir = get_app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let images_dir = app_data_dir.join(directory);
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images directory: {}", e))?;

    let image_path = images_dir.join(filename);
    fs::write(&image_path, image_data)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    let relative_path = format!("{}/{}", directory, filename);
    Ok((relative_path, image_path))
}

#[tauri::command]
pub async fn upload_menu_item_image(
    request: MenuItemImageUploadRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ImageUploadResponse>, String> {
    let image_data = request.image_data
        .replace("data:image/jpeg;base64,", "")
        .replace("data:image/png;base64,", "")
        .replace("data:image/webp;base64,", "");
    
    let decoded_data = general_purpose::STANDARD.decode(&image_data)
        .map_err(|e| format!("Invalid base64 data: {}", e))?;

    let original_size = decoded_data.len() as u64;
    let should_compress = request.compress.unwrap_or(true);
    
    let (final_data, compressed) = if should_compress {
        let max_width = request.max_width.unwrap_or(800);
        let max_height = request.max_height.unwrap_or(600);
        let quality = request.quality.unwrap_or(85);
        
        match compress_image(&decoded_data, max_width, max_height, quality) {
            Ok(compressed_data) => (compressed_data, true),
            Err(_) => (decoded_data, false),
        }
    } else {
        (decoded_data, false)
    };

    let final_size = final_data.len() as u64;
    let file_extension = if compressed { "jpg" } else {
        request.file_name.split('.').last().unwrap_or("jpg")
    };
    
    let image_filename = format!("menu_item_{}_{}.{}", 
        request.menu_item_id, 
        Utc::now().timestamp(), 
        file_extension
    );

    let (relative_path, _) = save_image_file(&final_data, "menu_images", &image_filename)?;

    match sqlx::query("UPDATE menu_items SET image_path = ? WHERE id = ? AND restaurant_id = ?")
        .bind(&relative_path)
        .bind(request.menu_item_id)
        .bind(request.restaurant_id)
        .execute(&*db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(ApiResponse {
                    success: true,
                    data: Some(ImageUploadResponse {
                        image_path: relative_path,
                        compressed,
                        original_size,
                        final_size,
                    }),
                    message: Some("Menu item image uploaded successfully".to_string()),
                    error: None,
                })
            } else {
                Err("Menu item not found or access denied".to_string())
            }
        },
        Err(e) => Err(format!("Database error: {}", e))
    }
}

#[tauri::command]
pub async fn upload_menu_category_image(
    request: MenuCategoryImageUploadRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ImageUploadResponse>, String> {
    let image_data = request.image_data
        .replace("data:image/jpeg;base64,", "")
        .replace("data:image/png;base64,", "")
        .replace("data:image/webp;base64,", "");
    
    let decoded_data = general_purpose::STANDARD.decode(&image_data)
        .map_err(|e| format!("Invalid base64 data: {}", e))?;

    let original_size = decoded_data.len() as u64;
    let should_compress = request.compress.unwrap_or(true);
    
    let (final_data, compressed) = if should_compress {
        let max_width = request.max_width.unwrap_or(400);
        let max_height = request.max_height.unwrap_or(300);
        let quality = request.quality.unwrap_or(85);
        
        match compress_image(&decoded_data, max_width, max_height, quality) {
            Ok(compressed_data) => (compressed_data, true),
            Err(_) => (decoded_data, false),
        }
    } else {
        (decoded_data, false)
    };

    let final_size = final_data.len() as u64;
    let file_extension = if compressed { "jpg" } else {
        request.file_name.split('.').last().unwrap_or("jpg")
    };
    
    let image_filename = format!("menu_category_{}_{}.{}", 
        request.category_id, 
        Utc::now().timestamp(), 
        file_extension
    );

    let (relative_path, _) = save_image_file(&final_data, "menu_images", &image_filename)?;

    match sqlx::query("UPDATE menu_categories SET image_path = ? WHERE id = ? AND restaurant_id = ?")
        .bind(&relative_path)
        .bind(request.category_id)
        .bind(request.restaurant_id)
        .execute(&*db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(ApiResponse {
                    success: true,
                    data: Some(ImageUploadResponse {
                        image_path: relative_path,
                        compressed,
                        original_size,
                        final_size,
                    }),
                    message: Some("Menu category image uploaded successfully".to_string()),
                    error: None,
                })
            } else {
                Err("Menu category not found or access denied".to_string())
            }
        },
        Err(e) => Err(format!("Database error: {}", e))
    }
}

#[tauri::command]
pub async fn get_menu_image(
    image_path: String,
) -> Result<ApiResponse<String>, String> {
    let app_data_dir = get_app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let full_path = app_data_dir.join(&image_path);
    
    match fs::read(&full_path) {
        Ok(image_data) => {
            let base64_data = general_purpose::STANDARD.encode(&image_data);
            let file_extension = image_path.split('.').last().unwrap_or("jpg");
            let data_url = format!("data:image/{};base64,{}", file_extension, base64_data);
            
            Ok(ApiResponse {
                success: true,
                data: Some(data_url),
                message: None,
                error: None,
            })
        },
        Err(_) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Image file not found".to_string()),
        })
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
    .bind(menu_item_id)
    .bind(restaurant_id)
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if let Some(Some(path)) = image_path {
        let app_data_dir = get_app_data_dir()
            .map_err(|e| e.to_string())?;

        let full_path = app_data_dir.join(&path);
        let _ = fs::remove_file(&full_path);
    }

    match sqlx::query("UPDATE menu_items SET image_path = NULL WHERE id = ? AND restaurant_id = ?")
        .bind(menu_item_id)
        .bind(restaurant_id)
        .execute(&*db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(ApiResponse {
                    success: true,
                    data: Some("Image deleted successfully".to_string()),
                    message: None,
                    error: None,
                })
            } else {
                Err("Menu item not found or access denied".to_string())
            }
        },
        Err(e) => Err(format!("Database error: {}", e))
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
    .bind(category_id)
    .bind(restaurant_id)
    .fetch_optional(&*db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    if let Some(Some(path)) = image_path {
        let app_data_dir = get_app_data_dir()
            .map_err(|e| e.to_string())?;

        let full_path = app_data_dir.join(&path);
        let _ = fs::remove_file(&full_path);
    }

    match sqlx::query("UPDATE menu_categories SET image_path = NULL WHERE id = ? AND restaurant_id = ?")
        .bind(category_id)
        .bind(restaurant_id)
        .execute(&*db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(ApiResponse {
                    success: true,
                    data: Some("Image deleted successfully".to_string()),
                    message: None,
                    error: None,
                })
            } else {
                Err("Menu category not found or access denied".to_string())
            }
        },
        Err(e) => Err(format!("Database error: {}", e))
    }
}