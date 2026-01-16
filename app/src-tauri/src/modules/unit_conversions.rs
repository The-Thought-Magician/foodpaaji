use crate::database::DbPool;
use crate::types::{UnitConversion, CreateUnitConversionRequest, ApiResponse};
use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize)]
pub struct ConversionResult {
    pub original_quantity: f64,
    pub original_unit: String,
    pub converted_quantity: f64,
    pub converted_unit: String,
    pub conversion_factor: f64,
}

#[derive(Deserialize)]
pub struct ConvertUnitsRequest {
    pub restaurant_id: i64,
    pub quantity: f64,
    pub from_unit: String,
    pub to_unit: String,
}

#[derive(Serialize)]
pub struct AvailableUnits {
    pub weight_units: Vec<String>,
    pub volume_units: Vec<String>,
    pub length_units: Vec<String>,
    pub count_units: Vec<String>,
}

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
        Ok(conversions) => Ok(ApiResponse {
            success: true,
            data: Some(conversions),
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
pub async fn create_unit_conversion(
    request: CreateUnitConversionRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<UnitConversion>, String> {
    if request.conversion_factor <= 0.0 {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Conversion factor must be greater than zero".to_string()),
        });
    }

    if request.from_unit.trim().is_empty() || request.to_unit.trim().is_empty() {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("From unit and to unit cannot be empty".to_string()),
        });
    }

    if request.from_unit.to_lowercase() == request.to_unit.to_lowercase() {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("From unit and to unit cannot be the same".to_string()),
        });
    }

    let existing_check = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM unit_conversions 
         WHERE restaurant_id = ? AND from_unit = ? AND to_unit = ? AND is_active = 1"
    )
    .bind(request.restaurant_id)
    .bind(&request.from_unit)
    .bind(&request.to_unit)
    .fetch_one(&*db)
    .await;

    match existing_check {
        Ok(count) if count > 0 => {
            return Ok(ApiResponse {
                success: false,
                data: None,
                message: None,
                error: Some("Conversion already exists for these units".to_string()),
            });
        },
        Err(e) => {
            return Ok(ApiResponse {
                success: false,
                data: None,
                message: None,
                error: Some(format!("Database error: {}", e)),
            });
        },
        _ => {}
    }

    match sqlx::query(
        "INSERT INTO unit_conversions (restaurant_id, from_unit, to_unit, conversion_factor) 
         VALUES (?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(&request.from_unit)
    .bind(&request.to_unit)
    .bind(request.conversion_factor)
    .execute(&*db)
    .await
    {
        Ok(result) => {
            let conversion_id = result.last_insert_rowid();
            match get_unit_conversion_by_id(conversion_id, &db).await {
                Ok(conversion) => {
                    let reverse_request = CreateUnitConversionRequest {
                        restaurant_id: request.restaurant_id,
                        from_unit: request.to_unit.clone(),
                        to_unit: request.from_unit.clone(),
                        conversion_factor: 1.0 / request.conversion_factor,
                    };

                    create_reverse_conversion(reverse_request, &db).await.ok();

                    Ok(ApiResponse {
                        success: true,
                        data: Some(conversion),
                        message: Some("Unit conversion created successfully".to_string()),
                        error: None,
                    })
                },
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

async fn create_reverse_conversion(
    request: CreateUnitConversionRequest,
    db: &DbPool,
) -> Result<(), String> {
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
pub async fn convert_units(
    request: ConvertUnitsRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ConversionResult>, String> {
    if request.from_unit.to_lowercase() == request.to_unit.to_lowercase() {
        return Ok(ApiResponse {
            success: true,
            data: Some(ConversionResult {
                original_quantity: request.quantity,
                original_unit: request.from_unit.clone(),
                converted_quantity: request.quantity,
                converted_unit: request.to_unit.clone(),
                conversion_factor: 1.0,
            }),
            message: Some("No conversion needed - units are the same".to_string()),
            error: None,
        });
    }

    match sqlx::query_as::<_, UnitConversion>(
        "SELECT id, restaurant_id, from_unit, to_unit, conversion_factor, 
         is_active, created_at FROM unit_conversions 
         WHERE restaurant_id = ? AND from_unit = ? AND to_unit = ? AND is_active = 1"
    )
    .bind(request.restaurant_id)
    .bind(&request.from_unit)
    .bind(&request.to_unit)
    .fetch_optional(&*db)
    .await
    {
        Ok(Some(conversion)) => {
            let converted_quantity = request.quantity * conversion.conversion_factor;
            Ok(ApiResponse {
                success: true,
                data: Some(ConversionResult {
                    original_quantity: request.quantity,
                    original_unit: request.from_unit,
                    converted_quantity,
                    converted_unit: request.to_unit,
                    conversion_factor: conversion.conversion_factor,
                }),
                message: None,
                error: None,
            })
        },
        Ok(None) => {
            Ok(ApiResponse {
                success: false,
                data: None,
                message: None,
                error: Some(format!("No conversion found from {} to {}", request.from_unit, request.to_unit)),
            })
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Database error: {}", e)),
        })
    }
}

#[tauri::command]
pub async fn get_available_units() -> Result<ApiResponse<AvailableUnits>, String> {
    let units = AvailableUnits {
        weight_units: vec![
            "kg".to_string(),
            "g".to_string(),
            "mg".to_string(),
            "lb".to_string(),
            "oz".to_string(),
            "ton".to_string(),
        ],
        volume_units: vec![
            "l".to_string(),
            "ml".to_string(),
            "gal".to_string(),
            "qt".to_string(),
            "pt".to_string(),
            "fl oz".to_string(),
            "cup".to_string(),
            "tbsp".to_string(),
            "tsp".to_string(),
        ],
        length_units: vec![
            "m".to_string(),
            "cm".to_string(),
            "mm".to_string(),
            "km".to_string(),
            "in".to_string(),
            "ft".to_string(),
            "yd".to_string(),
        ],
        count_units: vec![
            "piece".to_string(),
            "unit".to_string(),
            "dozen".to_string(),
            "pack".to_string(),
            "box".to_string(),
            "case".to_string(),
        ],
    };

    Ok(ApiResponse {
        success: true,
        data: Some(units),
        message: None,
        error: None,
    })
}

#[tauri::command]
pub async fn setup_default_conversions(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let default_conversions = vec![
        ("kg", "g", 1000.0),
        ("kg", "mg", 1000000.0),
        ("l", "ml", 1000.0),
        ("dozen", "piece", 12.0),
        ("m", "cm", 100.0),
        ("m", "mm", 1000.0),
        ("lb", "oz", 16.0),
        ("kg", "lb", 2.20462),
        ("l", "gal", 0.264172),
        ("cup", "tbsp", 16.0),
        ("tbsp", "tsp", 3.0),
    ];

    let mut created_count = 0;
    for (from_unit, to_unit, factor) in default_conversions {
        let request = CreateUnitConversionRequest {
            restaurant_id,
            from_unit: from_unit.to_string(),
            to_unit: to_unit.to_string(),
            conversion_factor: factor,
        };

        if let Ok(response) = create_unit_conversion(request, db.clone()).await {
            if response.success {
                created_count += 1;
            }
        }
    }

    Ok(ApiResponse {
        success: true,
        data: Some(format!("{} default conversions created", created_count)),
        message: Some("Default unit conversions setup completed".to_string()),
        error: None,
    })
}

async fn get_unit_conversion_by_id(id: i64, db: &DbPool) -> Result<UnitConversion, String> {
    sqlx::query_as::<_, UnitConversion>(
        "SELECT id, restaurant_id, from_unit, to_unit, conversion_factor, 
         is_active, created_at FROM unit_conversions WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}