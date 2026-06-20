use crate::database::DbPool;
use crate::types::{UnitConversion, CreateUnitConversionRequest, ApiResponse};
use tauri::State;

#[tauri::command]
pub async fn get_unit_conversions(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<UnitConversion>>, String> {
    match sqlx::query_as::<_, UnitConversion>(
        "SELECT id, restaurant_id, from_unit, to_unit, conversion_factor,
         is_active, created_at FROM unit_conversions
         WHERE restaurant_id = ? AND is_active = 1
         ORDER BY from_unit, to_unit"
    )
    .bind(restaurant_id)
    .fetch_all(&*db)
    .await
    {
        Ok(conversions) => Ok(ApiResponse { success: true, data: Some(conversions), message: None, error: None }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) })
    }
}

pub async fn get_unit_conversion_by_id(id: i64, db: &DbPool) -> Result<UnitConversion, String> {
    sqlx::query_as::<_, UnitConversion>(
        "SELECT id, restaurant_id, from_unit, to_unit, conversion_factor,
         is_active, created_at FROM unit_conversions WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

async fn create_reverse_conversion(request: CreateUnitConversionRequest, db: &DbPool) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO unit_conversions (restaurant_id, from_unit, to_unit, conversion_factor)
         VALUES (?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(&request.from_unit)
    .bind(&request.to_unit)
    .bind(request.conversion_factor)
    .execute(db)
    .await
    .map_err(|e| format!("Database error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn create_unit_conversion(
    request: CreateUnitConversionRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<UnitConversion>, String> {
    if request.conversion_factor <= 0.0 {
        return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Conversion factor must be greater than zero".to_string()) });
    }
    if request.from_unit.trim().is_empty() || request.to_unit.trim().is_empty() {
        return Ok(ApiResponse { success: false, data: None, message: None, error: Some("From unit and to unit cannot be empty".to_string()) });
    }
    if request.from_unit.to_lowercase() == request.to_unit.to_lowercase() {
        return Ok(ApiResponse { success: false, data: None, message: None, error: Some("From unit and to unit cannot be the same".to_string()) });
    }

    match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM unit_conversions
         WHERE restaurant_id = ? AND from_unit = ? AND to_unit = ? AND is_active = 1"
    )
    .bind(request.restaurant_id).bind(&request.from_unit).bind(&request.to_unit)
    .fetch_one(&*db).await {
        Ok(count) if count > 0 => return Ok(ApiResponse { success: false, data: None, message: None, error: Some("Conversion already exists for these units".to_string()) }),
        Err(e) => return Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
        _ => {}
    }

    match sqlx::query(
        "INSERT INTO unit_conversions (restaurant_id, from_unit, to_unit, conversion_factor)
         VALUES (?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(&request.from_unit).bind(&request.to_unit)
    .bind(request.conversion_factor)
    .execute(&*db).await {
        Ok(result) => {
            let conversion_id = result.last_insert_rowid();
            match get_unit_conversion_by_id(conversion_id, &db).await {
                Ok(conversion) => {
                    create_reverse_conversion(CreateUnitConversionRequest {
                        restaurant_id: request.restaurant_id,
                        from_unit: request.to_unit.clone(),
                        to_unit: request.from_unit.clone(),
                        conversion_factor: 1.0 / request.conversion_factor,
                    }, &db).await.ok();
                    Ok(ApiResponse { success: true, data: Some(conversion), message: Some("Unit conversion created successfully".to_string()), error: None })
                },
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) })
            }
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) })
    }
}
