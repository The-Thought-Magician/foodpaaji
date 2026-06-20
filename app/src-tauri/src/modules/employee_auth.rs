use crate::database::DbPool;
use crate::types::{User, UserWithHash, ApiResponse};
use crate::modules::employee::get_employee_by_id;
use tauri::State;
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Deserialize)]
pub struct EmployeeLoginRequest {
    pub email: String,
    pub password: String,
    pub restaurant_id: i64,
}

#[derive(Serialize)]
pub struct EmployeeLoginResponse {
    pub user: User,
    pub token: String,
}

#[tauri::command]
pub async fn authenticate_employee(
    request: EmployeeLoginRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<EmployeeLoginResponse>, String> {
    match sqlx::query_as::<_, UserWithHash>(
        "SELECT id, restaurant_id, email, phone, first_name, last_name,
         role, permissions, salary, hire_date, is_active,
         last_login, created_at, updated_at, password_hash
         FROM users WHERE email = ? AND restaurant_id = ? AND is_active = 1"
    )
    .bind(&request.email)
    .bind(request.restaurant_id)
    .fetch_optional(&*db)
    .await
    {
        Ok(Some(uwh)) => {
            if let Some(stored_hash) = &uwh.password_hash {
                match verify(&request.password, stored_hash) {
                    Ok(true) => {
                        sqlx::query("UPDATE users SET last_login = ? WHERE id = ?")
                            .bind(Utc::now().naive_utc()).bind(uwh.id)
                            .execute(&*db).await.ok();
                        let user = User {
                            id: uwh.id, restaurant_id: uwh.restaurant_id, email: uwh.email,
                            phone: uwh.phone, first_name: uwh.first_name, last_name: uwh.last_name,
                            role: uwh.role, permissions: uwh.permissions, salary: uwh.salary,
                            hire_date: uwh.hire_date, is_active: uwh.is_active,
                            last_login: Some(Utc::now()), created_at: uwh.created_at, updated_at: uwh.updated_at,
                        };
                        let user_id = user.id.ok_or("User ID is missing")?;
                        let token = crate::modules::auth::generate_jwt(user_id.to_string(), 86400)
                            .map_err(|e| format!("Token generation error: {}", e))?;
                        Ok(ApiResponse { success: true, data: Some(EmployeeLoginResponse { user, token }), message: Some("Authentication successful".to_string()), error: None })
                    },
                    Ok(false) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("Invalid password".to_string()) }),
                    Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Password verification error: {}", e)) }),
                }
            } else {
                Ok(ApiResponse { success: false, data: None, message: None, error: Some("Employee account not properly configured".to_string()) })
            }
        },
        Ok(None) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("Invalid email or employee not active".to_string()) }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[derive(Deserialize)]
pub struct UpdatePasswordRequest {
    pub employee_id: i64,
    pub current_password: String,
    pub new_password: String,
}

#[tauri::command]
pub async fn update_employee_password(
    request: UpdatePasswordRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    match sqlx::query_scalar::<_, String>(
        "SELECT password_hash FROM users WHERE id = ? AND is_active = 1"
    )
    .bind(request.employee_id)
    .fetch_optional(&*db)
    .await
    {
        Ok(Some(stored_hash)) => {
            match verify(&request.current_password, &stored_hash) {
                Ok(true) => {
                    let new_hash = hash(&request.new_password, DEFAULT_COST).map_err(|e| format!("Hash error: {}", e))?;
                    match sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
                        .bind(&new_hash).bind(request.employee_id).execute(&*db).await
                    {
                        Ok(_) => Ok(ApiResponse { success: true, data: Some("Password updated successfully".to_string()), message: Some("Password updated successfully".to_string()), error: None }),
                        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
                    }
                },
                Ok(false) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("Current password is incorrect".to_string()) }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Password verification error: {}", e)) }),
            }
        },
        Ok(None) => Ok(ApiResponse { success: false, data: None, message: None, error: Some("Employee not found or inactive".to_string()) }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}
