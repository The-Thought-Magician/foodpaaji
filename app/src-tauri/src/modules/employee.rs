use crate::database::DbPool;
use crate::types::{User, CreateUserRequest, ApiResponse};
use tauri::State;
use bcrypt::{hash, DEFAULT_COST};
use serde::{Deserialize, Serialize};

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
        Ok(employees) => Ok(ApiResponse { success: true, data: Some(employees), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
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

    let mut query = "SELECT id, restaurant_id, email, phone, first_name, last_name, \
                     role, permissions, salary, hire_date, is_active, \
                     last_login, created_at, updated_at \
                     FROM users WHERE restaurant_id = ?".to_string();
    let mut count_query = "SELECT COUNT(*) FROM users WHERE restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(search) = &request.search {
        if !search.trim().is_empty() {
            query.push_str(" AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
            count_query.push_str(" AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
            let p = format!("%{}%", search.trim());
            params.extend(vec![p.clone(), p.clone(), p.clone(), p]);
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

    let mut total_query = sqlx::query_scalar::<_, i64>(&count_query);
    for param in params.iter().take(params.len() - 2) { total_query = total_query.bind(param); }
    let mut emp_query = sqlx::query_as::<_, User>(&query);
    for param in &params { emp_query = emp_query.bind(param); }

    match tokio::try_join!(total_query.fetch_one(&*db), emp_query.fetch_all(&*db)) {
        Ok((total, employees)) => Ok(ApiResponse {
            success: true,
            data: Some(EmployeeSearchResponse { employees, total, page, limit }),
            message: None, error: None,
        }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn create_employee(
    request: CreateUserRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<User>, String> {
    let password_hash = hash(&request.password, DEFAULT_COST).map_err(|e| format!("Hash error: {}", e))?;
    let role = request.role.to_uppercase();
    match sqlx::query(
        "INSERT INTO users (restaurant_id, email, phone, password_hash, first_name, last_name, role, salary, hire_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(&request.email).bind(&request.phone)
    .bind(&password_hash).bind(&request.first_name).bind(&request.last_name)
    .bind(&role).bind(request.salary).bind(&request.hire_date)
    .execute(&*db).await
    {
        Ok(result) => {
            let user_id = result.last_insert_rowid();
            match get_employee_by_id(user_id, &db).await {
                Ok(user) => Ok(ApiResponse { success: true, data: Some(user), message: Some("Employee created successfully".to_string()), error: None }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
            }
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[derive(Deserialize)]
pub struct UpdateEmployeeRequest {
    pub id: i64,
    pub restaurant_id: i64,
    pub email: String,
    pub phone: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub salary: Option<f64>,
    pub hire_date: Option<String>,
    pub is_active: bool,
}

#[tauri::command]
pub async fn update_employee(
    request: UpdateEmployeeRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<User>, String> {
    let role = request.role.to_uppercase();
    match sqlx::query(
        "UPDATE users SET email=?, phone=?, first_name=?, last_name=?, role=?, salary=?, hire_date=?, is_active=?
         WHERE id=? AND restaurant_id=?"
    )
    .bind(&request.email).bind(&request.phone).bind(&request.first_name).bind(&request.last_name)
    .bind(&role).bind(request.salary).bind(&request.hire_date).bind(request.is_active)
    .bind(request.id).bind(request.restaurant_id)
    .execute(&*db).await
    {
        Ok(_) => match get_employee_by_id(request.id, &db).await {
            Ok(user) => Ok(ApiResponse { success: true, data: Some(user), message: Some("Employee updated".to_string()), error: None }),
            Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

pub async fn get_employee_by_id(id: i64, db: &DbPool) -> Result<User, String> {
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
