use crate::database::DbPool;
use crate::types::{User, CreateUserRequest, ApiResponse};
use sqlx::Row;
use tauri::State;

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
    .fetch_all(&**db)
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
pub async fn create_employee(
    request: CreateUserRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<User>, String> {
    let password_hash = format!("$2b$12${}", request.password);
    
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
    .bind(&request.role)
    .bind(request.salary)
    .bind(&request.hire_date)
    .execute(&**db)
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