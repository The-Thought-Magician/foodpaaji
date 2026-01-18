use crate::database::{DbPool, get_app_data_dir};
use crate::types::ApiResponse;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use std::path::PathBuf;
use std::fs;
use base64::{Engine as _, engine::general_purpose};
use sqlx::Row;

#[derive(Deserialize)]
pub struct EmployeeImageUploadRequest {
    pub employee_id: i64,
    pub image_data: String,
    pub file_name: String,
}

#[tauri::command]
pub async fn upload_employee_image(
    request: EmployeeImageUploadRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let image_data = request.image_data.replace("data:image/jpeg;base64,", "")
        .replace("data:image/png;base64,", "")
        .replace("data:image/webp;base64,", "");
    
    let decoded_data = general_purpose::STANDARD.decode(&image_data)
        .map_err(|e| format!("Invalid base64 data: {}", e))?;

    let app_data_dir = get_app_data_dir().map_err(|e| e.to_string())?;
    
    let images_dir = app_data_dir.join("employee_images");
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images directory: {}", e))?;

    let file_extension = request.file_name.split('.').last().unwrap_or("jpg");
    let image_filename = format!("employee_{}_{}.{}", 
        request.employee_id, 
        Utc::now().timestamp(), 
        file_extension
    );
    let image_path = images_dir.join(&image_filename);

    fs::write(&image_path, decoded_data)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    let relative_path = format!("employee_images/{}", image_filename);

    match sqlx::query("UPDATE users SET profile_image = ? WHERE id = ?")
        .bind(&relative_path)
        .bind(request.employee_id)
        .execute(&*db)
        .await
    {
        Ok(_) => Ok(ApiResponse {
            success: true,
            data: Some(relative_path),
            message: Some("Profile image uploaded successfully".to_string()),
            error: None,
        }),
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn get_employee_image(
    employee_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    match sqlx::query_scalar::<_, String>(
        "SELECT profile_image FROM users WHERE id = ?"
    )
    .bind(employee_id)
    .fetch_optional(&*db)
    .await
    {
        Ok(Some(image_path)) => {
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
        },
        Ok(None) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("No profile image found".to_string()),
        }),
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[derive(Deserialize)]
pub struct DeleteEmployeeRequest {
    pub employee_id: i64,
    pub requesting_user_role: String,
}

#[tauri::command]
pub async fn delete_employee(
    request: DeleteEmployeeRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    if !crate::modules::permissions::check_permission(
        &request.requesting_user_role, 
        crate::modules::permissions::Permission::DeleteEmployees
    ) {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Insufficient permissions to delete employees".to_string()),
        });
    }

    match sqlx::query("UPDATE users SET is_active = 0 WHERE id = ?")
        .bind(request.employee_id)
        .execute(&*db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(ApiResponse {
                    success: true,
                    data: Some("Employee deactivated successfully".to_string()),
                    message: Some("Employee deactivated successfully".to_string()),
                    error: None,
                })
            } else {
                Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Employee not found".to_string()),
                })
            }
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}