use crate::database::DbPool;
use crate::types::{UnitConversion, CreateUnitConversionRequest, ApiResponse};
use crate::modules::unit_conversions::create_unit_conversion;
use tauri::State;
use serde::{Deserialize, Serialize};

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
pub async fn convert_units(
    request: ConvertUnitsRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<ConversionResult>, String> {
    if request.from_unit.to_lowercase() == request.to_unit.to_lowercase() {
        return Ok(ApiResponse {
            success: true,
            data: Some(ConversionResult {
                original_quantity: request.quantity, original_unit: request.from_unit.clone(),
                converted_quantity: request.quantity, converted_unit: request.to_unit.clone(),
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
    .bind(request.restaurant_id).bind(&request.from_unit).bind(&request.to_unit)
    .fetch_optional(&*db).await {
        Ok(Some(conversion)) => Ok(ApiResponse {
            success: true,
            data: Some(ConversionResult {
                original_quantity: request.quantity, original_unit: request.from_unit,
                converted_quantity: request.quantity * conversion.conversion_factor,
                converted_unit: request.to_unit, conversion_factor: conversion.conversion_factor,
            }),
            message: None, error: None,
        }),
        Ok(None) => Ok(ApiResponse {
            success: false, data: None, message: None,
            error: Some(format!("No conversion found from {} to {}", request.from_unit, request.to_unit)),
        }),
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) })
    }
}

#[tauri::command]
pub async fn get_available_units() -> Result<ApiResponse<AvailableUnits>, String> {
    Ok(ApiResponse {
        success: true,
        data: Some(AvailableUnits {
            weight_units: vec!["kg", "g", "mg", "lb", "oz", "ton"].into_iter().map(String::from).collect(),
            volume_units: vec!["l", "ml", "gal", "qt", "pt", "fl oz", "cup", "tbsp", "tsp"].into_iter().map(String::from).collect(),
            length_units: vec!["m", "cm", "mm", "km", "in", "ft", "yd"].into_iter().map(String::from).collect(),
            count_units: vec!["piece", "unit", "dozen", "pack", "box", "case"].into_iter().map(String::from).collect(),
        }),
        message: None, error: None,
    })
}

#[tauri::command]
pub async fn setup_default_conversions(
    restaurant_id: i64,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let defaults = vec![
        ("kg", "g", 1000.0), ("kg", "mg", 1000000.0), ("l", "ml", 1000.0),
        ("dozen", "piece", 12.0), ("m", "cm", 100.0), ("m", "mm", 1000.0),
        ("lb", "oz", 16.0), ("kg", "lb", 2.20462), ("l", "gal", 0.264172),
        ("cup", "tbsp", 16.0), ("tbsp", "tsp", 3.0),
    ];

    let mut created_count = 0;
    for (from_unit, to_unit, factor) in defaults {
        if let Ok(r) = create_unit_conversion(CreateUnitConversionRequest {
            restaurant_id, from_unit: from_unit.to_string(),
            to_unit: to_unit.to_string(), conversion_factor: factor,
        }, db.clone()).await {
            if r.success { created_count += 1; }
        }
    }

    Ok(ApiResponse {
        success: true,
        data: Some(format!("{} default conversions created", created_count)),
        message: Some("Default unit conversions setup completed".to_string()),
        error: None,
    })
}
