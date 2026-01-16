use crate::database::DbPool;
use crate::types::{CreateStockMovementRequest, ApiResponse};
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryTransfer {
    pub id: Option<i64>,
    pub restaurant_id: i64,
    pub transfer_number: String,
    pub from_location: String,
    pub to_location: String,
    pub status: String,
    pub requested_by: i64,
    pub approved_by: Option<i64>,
    pub completed_by: Option<i64>,
    pub notes: Option<String>,
    pub total_items: i32,
    pub total_value: f64,
    pub requested_at: Option<chrono::DateTime<chrono::Utc>>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TransferItem {
    pub id: Option<i64>,
    pub transfer_id: i64,
    pub inventory_item_id: i64,
    pub item_name: String,
    pub requested_quantity: f64,
    pub approved_quantity: Option<f64>,
    pub transferred_quantity: Option<f64>,
    pub unit: String,
    pub unit_cost: f64,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTransferRequest {
    pub restaurant_id: i64,
    pub from_location: String,
    pub to_location: String,
    pub items: Vec<TransferItemRequest>,
    pub notes: Option<String>,
    pub requested_by: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferItemRequest {
    pub inventory_item_id: i64,
    pub quantity: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferApprovalRequest {
    pub transfer_id: i64,
    pub approved_by: i64,
    pub item_approvals: Vec<ItemApproval>,
    pub approval_notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItemApproval {
    pub transfer_item_id: i64,
    pub approved_quantity: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferCompletionRequest {
    pub transfer_id: i64,
    pub completed_by: i64,
    pub item_completions: Vec<ItemCompletion>,
    pub completion_notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItemCompletion {
    pub transfer_item_id: i64,
    pub transferred_quantity: f64,
}

#[tauri::command]
pub async fn create_inventory_transfer(
    request: CreateTransferRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<InventoryTransfer>, String> {
    if request.from_location == request.to_location {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("From and to locations cannot be the same".to_string()),
        });
    }

    let transfer_number = generate_transfer_number().await;
    let mut total_value = 0.0;

    for item_request in &request.items {
        let cost = get_item_cost(item_request.inventory_item_id, &db).await?;
        total_value += cost * item_request.quantity;
    }

    match sqlx::query(
        "INSERT INTO inventory_transfers (restaurant_id, transfer_number, from_location, 
         to_location, status, requested_by, notes, total_items, total_value, requested_at) 
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id)
    .bind(&transfer_number)
    .bind(&request.from_location)
    .bind(&request.to_location)
    .bind(request.requested_by)
    .bind(&request.notes)
    .bind(request.items.len() as i32)
    .bind(total_value)
    .bind(Utc::now().naive_utc())
    .execute(&*db)
    .await
    {
        Ok(result) => {
            let transfer_id = result.last_insert_rowid();

            for item_request in &request.items {
                let item_cost = get_item_cost(item_request.inventory_item_id, &db).await?;
                let item_name = get_item_name(item_request.inventory_item_id, &db).await?;
                let unit = get_item_unit(item_request.inventory_item_id, &db).await?;

                sqlx::query(
                    "INSERT INTO transfer_items (transfer_id, inventory_item_id, item_name, 
                     requested_quantity, unit, unit_cost, status, notes) 
                     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)"
                )
                .bind(transfer_id)
                .bind(item_request.inventory_item_id)
                .bind(&item_name)
                .bind(item_request.quantity)
                .bind(&unit)
                .bind(item_cost)
                .bind(&item_request.notes)
                .execute(&*db)
                .await
                .map_err(|e| format!("Failed to create transfer item: {}", e))?;
            }

            match get_transfer_by_id(transfer_id, &db).await {
                Ok(transfer) => Ok(ApiResponse {
                    success: true,
                    data: Some(transfer),
                    message: Some("Transfer request created successfully".to_string()),
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

#[tauri::command]
pub async fn approve_transfer(
    request: TransferApprovalRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    sqlx::query(
        "UPDATE inventory_transfers SET status = 'APPROVED', approved_by = ?, 
         approved_at = ? WHERE id = ?"
    )
    .bind(request.approved_by)
    .bind(Utc::now().naive_utc())
    .bind(request.transfer_id)
    .execute(&*db)
    .await
    .map_err(|e| format!("Failed to approve transfer: {}", e))?;

    for approval in &request.item_approvals {
        sqlx::query(
            "UPDATE transfer_items SET approved_quantity = ?, status = 'APPROVED' 
             WHERE id = ?"
        )
        .bind(approval.approved_quantity)
        .bind(approval.transfer_item_id)
        .execute(&*db)
        .await
        .map_err(|e| format!("Failed to approve transfer item: {}", e))?;
    }

    Ok(ApiResponse {
        success: true,
        data: Some("Transfer approved successfully".to_string()),
        message: Some("Transfer has been approved and is ready for execution".to_string()),
        error: None,
    })
}

#[tauri::command]
pub async fn complete_transfer(
    request: TransferCompletionRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let transfer = get_transfer_by_id(request.transfer_id, &db).await?;
    
    if transfer.status != "APPROVED" {
        return Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some("Transfer must be approved before completion".to_string()),
        });
    }

    for completion in &request.item_completions {
        let item = get_transfer_item_by_id(completion.transfer_item_id, &db).await?;
        
        if completion.transferred_quantity > 0.0 {
            create_transfer_stock_movements(
                &transfer,
                &item,
                completion.transferred_quantity,
                request.completed_by,
                &db
            ).await?;
        }

        sqlx::query(
            "UPDATE transfer_items SET transferred_quantity = ?, status = 'COMPLETED' 
             WHERE id = ?"
        )
        .bind(completion.transferred_quantity)
        .bind(completion.transfer_item_id)
        .execute(&*db)
        .await
        .map_err(|e| format!("Failed to update transfer item: {}", e))?;
    }

    sqlx::query(
        "UPDATE inventory_transfers SET status = 'COMPLETED', completed_by = ?, 
         completed_at = ? WHERE id = ?"
    )
    .bind(request.completed_by)
    .bind(Utc::now().naive_utc())
    .bind(request.transfer_id)
    .execute(&*db)
    .await
    .map_err(|e| format!("Failed to complete transfer: {}", e))?;

    Ok(ApiResponse {
        success: true,
        data: Some("Transfer completed successfully".to_string()),
        message: Some("Inventory has been transferred between locations".to_string()),
        error: None,
    })
}

#[derive(Deserialize)]
pub struct TransferSearchRequest {
    pub restaurant_id: i64,
    pub status: Option<String>,
    pub from_location: Option<String>,
    pub to_location: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct TransferSearchResponse {
    pub transfers: Vec<InventoryTransfer>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[tauri::command]
pub async fn get_inventory_transfers(
    request: TransferSearchRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<TransferSearchResponse>, String> {
    let page = request.page.unwrap_or(1);
    let limit = request.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let mut query = "SELECT id, restaurant_id, transfer_number, from_location, to_location, 
                     status, requested_by, approved_by, completed_by, notes, total_items, 
                     total_value, requested_at, approved_at, completed_at, created_at 
                     FROM inventory_transfers WHERE restaurant_id = ?".to_string();
    
    let mut count_query = "SELECT COUNT(*) FROM inventory_transfers WHERE restaurant_id = ?".to_string();
    let mut params = vec![request.restaurant_id.to_string()];

    if let Some(status) = &request.status {
        if !status.trim().is_empty() {
            query.push_str(" AND status = ?");
            count_query.push_str(" AND status = ?");
            params.push(status.to_uppercase());
        }
    }

    if let Some(from_location) = &request.from_location {
        if !from_location.trim().is_empty() {
            query.push_str(" AND from_location = ?");
            count_query.push_str(" AND from_location = ?");
            params.push(from_location.clone());
        }
    }

    if let Some(to_location) = &request.to_location {
        if !to_location.trim().is_empty() {
            query.push_str(" AND to_location = ?");
            count_query.push_str(" AND to_location = ?");
            params.push(to_location.clone());
        }
    }

    query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let total_result = sqlx::query_scalar::<_, i64>(&count_query);
    let mut total_query = total_result;
    for param in params.iter().take(params.len() - 2) {
        total_query = total_query.bind(param);
    }

    let transfers_result = sqlx::query_as::<_, InventoryTransfer>(&query);
    let mut transfers_query = transfers_result;
    for param in &params {
        transfers_query = transfers_query.bind(param);
    }

    match tokio::try_join!(
        total_query.fetch_one(&*db),
        transfers_query.fetch_all(&*db)
    ) {
        Ok((total, transfers)) => Ok(ApiResponse {
            success: true,
            data: Some(TransferSearchResponse {
                transfers,
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

async fn get_transfer_by_id(id: i64, db: &DbPool) -> Result<InventoryTransfer, String> {
    sqlx::query_as::<_, InventoryTransfer>(
        "SELECT id, restaurant_id, transfer_number, from_location, to_location, 
         status, requested_by, approved_by, completed_by, notes, total_items, 
         total_value, requested_at, approved_at, completed_at, created_at 
         FROM inventory_transfers WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

async fn get_transfer_item_by_id(id: i64, db: &DbPool) -> Result<TransferItem, String> {
    sqlx::query_as::<_, TransferItem>(
        "SELECT id, transfer_id, inventory_item_id, item_name, requested_quantity, 
         approved_quantity, transferred_quantity, unit, unit_cost, status, notes 
         FROM transfer_items WHERE id = ?"
    )
    .bind(id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

async fn create_transfer_stock_movements(
    transfer: &InventoryTransfer,
    item: &TransferItem,
    quantity: f64,
    user_id: i64,
    db: &DbPool,
) -> Result<(), String> {
    let out_request = CreateStockMovementRequest {
        restaurant_id: transfer.restaurant_id,
        inventory_item_id: item.inventory_item_id,
        movement_type: "TRANSFER".to_string(),
        quantity,
        unit_cost: Some(item.unit_cost),
        reference_type: Some("INVENTORY_TRANSFER_OUT".to_string()),
        reference_id: Some(transfer.id.unwrap_or(0)),
        batch_number: None,
        expiry_date: None,
        notes: Some(format!("Transfer OUT from {} to {} - {}", 
                           transfer.from_location, transfer.to_location, transfer.transfer_number)),
        user_id: Some(user_id),
    };

    let in_request = CreateStockMovementRequest {
        restaurant_id: transfer.restaurant_id,
        inventory_item_id: item.inventory_item_id,
        movement_type: "IN".to_string(),
        quantity,
        unit_cost: Some(item.unit_cost),
        reference_type: Some("INVENTORY_TRANSFER_IN".to_string()),
        reference_id: Some(transfer.id.unwrap_or(0)),
        batch_number: None,
        expiry_date: None,
        notes: Some(format!("Transfer IN from {} to {} - {}", 
                           transfer.from_location, transfer.to_location, transfer.transfer_number)),
        user_id: Some(user_id),
    };

    let total_cost = item.unit_cost * quantity;

    sqlx::query(
        "INSERT INTO stock_movements (restaurant_id, inventory_item_id, movement_type, 
         quantity, unit_cost, total_cost, reference_type, reference_id, notes, 
         user_id, movement_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(out_request.restaurant_id)
    .bind(out_request.inventory_item_id)
    .bind(&out_request.movement_type)
    .bind(-quantity)
    .bind(out_request.unit_cost)
    .bind(-total_cost)
    .bind(&out_request.reference_type)
    .bind(out_request.reference_id)
    .bind(&out_request.notes)
    .bind(out_request.user_id)
    .bind(Utc::now().naive_utc())
    .execute(db)
    .await
    .map_err(|e| format!("Failed to create OUT movement: {}", e))?;

    sqlx::query(
        "INSERT INTO stock_movements (restaurant_id, inventory_item_id, movement_type, 
         quantity, unit_cost, total_cost, reference_type, reference_id, notes, 
         user_id, movement_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(in_request.restaurant_id)
    .bind(in_request.inventory_item_id)
    .bind(&in_request.movement_type)
    .bind(quantity)
    .bind(in_request.unit_cost)
    .bind(total_cost)
    .bind(&in_request.reference_type)
    .bind(in_request.reference_id)
    .bind(&in_request.notes)
    .bind(in_request.user_id)
    .bind(Utc::now().naive_utc())
    .execute(db)
    .await
    .map_err(|e| format!("Failed to create IN movement: {}", e))?;

    Ok(())
}

async fn get_item_cost(item_id: i64, db: &DbPool) -> Result<f64, String> {
    sqlx::query_scalar!("SELECT cost_price FROM inventory_items WHERE id = ?", item_id)
        .fetch_one(db)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

async fn get_item_name(item_id: i64, db: &DbPool) -> Result<String, String> {
    sqlx::query_scalar!("SELECT name FROM inventory_items WHERE id = ?", item_id)
        .fetch_one(db)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

async fn get_item_unit(item_id: i64, db: &DbPool) -> Result<String, String> {
    sqlx::query_scalar!("SELECT base_unit FROM inventory_items WHERE id = ?", item_id)
        .fetch_one(db)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

async fn generate_transfer_number() -> String {
    let now = Utc::now();
    format!("TXN{}", now.format("%Y%m%d%H%M%S"))
}