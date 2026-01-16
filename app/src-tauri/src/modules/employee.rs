use crate::database::DbPool;
use crate::types::{User, UserWithHash, CreateUserRequest, ApiResponse};
use tauri::State;
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use std::path::PathBuf;
use std::fs;
use base64::{Engine as _, engine::general_purpose};

#[derive(Deserialize)]
pub struct EmployeeSearchRequest {
    pub restaurant_id: i64,
    pub search: Option<String>,
    pub role_filter: Option<String>,
    pub status_filter: Option<bool>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct EmployeeSearchResponse {
    pub employees: Vec<User>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[tauri::command]
pub async fn get_employees(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<User>>, String> {
    match sqlx::query_as::<_, User>(
        "SELECT id, restaurant_id, email, phone, first_name, last_name, 
         role, permissions, salary, hire_date, is_active, 
         last_login, created_at, updated_at 
         FROM users WHERE restaurant_id = ? ORDER BY created_at DESC"
    )
    .bind(restaurant_id)
    .fetch_all(&*db)
    .await
    {
        Ok(employees) => Ok(ApiResponse {
            success: true,
            data: Some(employees),
            message: None,
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
pub async fn search_employees(
    request: EmployeeSearchRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<EmployeeSearchResponse>, String> {
    let page = request.page.unwrap_or(1);
    let limit = request.limit.unwrap_or(10);
    let offset = (page - 1) * limit;

    let mut query = "SELECT id, restaurant_id, email, phone, first_name, last_name, 
                     role, permissions, salary, hire_date, is_active, 
                     last_login, created_at, updated_at 
                     FROM users WHERE restaurant_id = ?".to_string();
    
    let mut count_query = "SELECT COUNT(*) FROM users WHERE restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(search) = &request.search {
        if !search.trim().is_empty() {
            query.push_str(" AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
            count_query.push_str(" AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
            let search_pattern = format!("%{}%", search.trim());
            params.extend(vec![
                search_pattern.clone(),
                search_pattern.clone(),
                search_pattern.clone(),
                search_pattern
            ]);
        }
    }

    if let Some(role) = &request.role_filter {
        if !role.trim().is_empty() {
            query.push_str(" AND role = ?");
            count_query.push_str(" AND role = ?");
            params.push(role.to_uppercase());
        }
    }

    if let Some(status) = request.status_filter {
        query.push_str(" AND is_active = ?");
        count_query.push_str(" AND is_active = ?");
        params.push((status as i64).to_string());
    }

    query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let total_result = sqlx::query_scalar::<_, i64>(&count_query);
    let mut total_query = total_result;
    for (i, param) in params.iter().take(params.len() - 2).enumerate() {
        total_query = total_query.bind(param);
    }

    let employees_result = sqlx::query_as::<_, User>(&query);
    let mut employees_query = employees_result;
    for param in &params {
        employees_query = employees_query.bind(param);
    }

    match tokio::try_join!(
        total_query.fetch_one(&*db),
        employees_query.fetch_all(&*db)
    ) {
        Ok((total, employees)) => Ok(ApiResponse {
            success: true,
            data: Some(EmployeeSearchResponse {
                employees,
                total,
                page,
                limit,
            }),
            message: None,
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
pub async fn create_employee(
    request: CreateUserRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<User>, String> {
    let password_hash = hash(&request.password, DEFAULT_COST)
        .map_err(|e| format!("Hash error: {}", e))?;
    let role = request.role.to_uppercase();
    
    match sqlx::query(
    "INSERT INTO users (restaurant_id, email, phone, password_hash, 
     first_name, last_name, role, salary, hire_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(&request.email)
    .bind(&request.phone)
    .bind(&password_hash)
    .bind(&request.first_name)
    .bind(&request.last_name)
    .bind(&role)
    .bind(request.salary)
    .bind(&request.hire_date)
    .execute(&*db)
    .await
    {
        Ok(result) => {
            let user_id = result.last_insert_rowid();
            match get_employee_by_id(user_id, &db).await {
                Ok(user) => Ok(ApiResponse {
                    success: true,
                    data: Some(user),
                    message: Some("Employee created successfully".to_string()),
                    error: None,
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(e),
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

async fn get_employee_by_id(id: i64, db: &DbPool) -> Result<User, String> {
    sqlx::query_as::<_, User>(
        "SELECT id, restaurant_id, email, phone, first_name, last_name, 
         role, permissions, salary, hire_date, is_active, 
         last_login, created_at, updated_at 
         FROM users WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

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
        Ok(Some(user_with_hash)) => {
            if let Some(stored_hash) = &user_with_hash.password_hash {
                match verify(&request.password, stored_hash) {
                    Ok(true) => {
                        sqlx::query("UPDATE users SET last_login = ? WHERE id = ?")
                            .bind(Utc::now().naive_utc())
                            .bind(user_with_hash.id)
                            .execute(&*db)
                            .await
                            .ok();

                        let user = User {
                            id: user_with_hash.id,
                            restaurant_id: user_with_hash.restaurant_id,
                            email: user_with_hash.email,
                            phone: user_with_hash.phone,
                            first_name: user_with_hash.first_name,
                            last_name: user_with_hash.last_name,
                            role: user_with_hash.role,
                            permissions: user_with_hash.permissions,
                            salary: user_with_hash.salary,
                            hire_date: user_with_hash.hire_date,
                            is_active: user_with_hash.is_active,
                            last_login: Some(Utc::now().naive_utc()),
                            created_at: user_with_hash.created_at,
                            updated_at: user_with_hash.updated_at,
                        };

                        let token = crate::modules::auth::generate_jwt(user.id, &user.role)
                            .map_err(|e| format!("Token generation error: {}", e))?;

                        Ok(ApiResponse {
                            success: true,
                            data: Some(EmployeeLoginResponse { user, token }),
                            message: Some("Authentication successful".to_string()),
                            error: None,
                        })
                    },
                    Ok(false) => Ok(ApiResponse {
                        success: false,
                        data: None,
                        message: None,
                        error: Some("Invalid password".to_string()),
                    }),
                    Err(e) => Ok(ApiResponse {
                        success: false,
                        data: None,
                        message: None,
                        error: Some(format!("Password verification error: {}", e)),
                    })
                }
            } else {
                Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Employee account not properly configured".to_string()),
                })
            }
        },
        Ok(None) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid email or employee not active".to_string()),
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
                    let new_hash = hash(&request.new_password, DEFAULT_COST)
                        .map_err(|e| format!("Hash error: {}", e))?;

                    match sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
                        .bind(&new_hash)
                        .bind(request.employee_id)
                        .execute(&*db)
                        .await
                    {
                        Ok(_) => Ok(ApiResponse {
                            success: true,
                            data: Some("Password updated successfully".to_string()),
                            message: Some("Password updated successfully".to_string()),
                            error: None,
                        }),
                        Err(e) => Ok(ApiResponse {
                            success: false,
                            data: None,
                            message: None,
                            error: Some(format!("Database error: {}", e)),
                        })
                    }
                },
                Ok(false) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some("Current password is incorrect".to_string()),
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(format!("Password verification error: {}", e)),
                })
            }
        },
        Ok(None) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Employee not found or inactive".to_string()),
        }),
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}