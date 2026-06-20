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
        return Ok(ApiResponse { success: false, data: None, message: None,
            error: Some("From and to locations cannot be the same".to_string()) });
    }

    let transfer_number = format!("TXN{}", Utc::now().format("%Y%m%d%H%M%S"));
    let mut total_value = 0.0;
    for item_req in &request.items {
        let cost = get_item_cost(item_req.inventory_item_id, &db).await?;
        total_value += cost * item_req.quantity;
    }

    match sqlx::query(
        "INSERT INTO inventory_transfers (restaurant_id, transfer_number, from_location,
         to_location, status, requested_by, notes, total_items, total_value, requested_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)"
    )
    .bind(request.restaurant_id).bind(&transfer_number).bind(&request.from_location)
    .bind(&request.to_location).bind(request.requested_by).bind(&request.notes)
    .bind(request.items.len() as i32).bind(total_value).bind(Utc::now().naive_utc())
    .execute(&*db).await
    {
        Ok(result) => {
            let transfer_id = result.last_insert_rowid();
            for item_req in &request.items {
                let cost = get_item_cost(item_req.inventory_item_id, &db).await?;
                let name = get_item_name(item_req.inventory_item_id, &db).await?;
                let unit = get_item_unit(item_req.inventory_item_id, &db).await?;
                sqlx::query(
                    "INSERT INTO transfer_items (transfer_id, inventory_item_id, item_name,
                     requested_quantity, unit, unit_cost, status, notes)
                     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)"
                )
                .bind(transfer_id).bind(item_req.inventory_item_id).bind(&name)
                .bind(item_req.quantity).bind(&unit).bind(cost).bind(&item_req.notes)
                .execute(&*db).await
                .map_err(|e| format!("Failed to create transfer item: {}", e))?;
            }
            match get_transfer_by_id(transfer_id, &db).await {
                Ok(t) => Ok(ApiResponse { success: true, data: Some(t), message: Some("Transfer request created successfully".to_string()), error: None }),
                Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(e) }),
            }
        },
        Err(e) => Ok(ApiResponse { success: false, data: None, message: None, error: Some(format!("Database error: {}", e)) }),
    }
}

#[tauri::command]
pub async fn approve_transfer(
    request: TransferApprovalRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    sqlx::query(
        "UPDATE inventory_transfers SET status = 'APPROVED', approved_by = ?, approved_at = ? WHERE id = ?"
    )
    .bind(request.approved_by).bind(Utc::now().naive_utc()).bind(request.transfer_id)
    .execute(&*db).await
    .map_err(|e| format!("Failed to approve transfer: {}", e))?;

    for approval in &request.item_approvals {
        sqlx::query("UPDATE transfer_items SET approved_quantity = ?, status = 'APPROVED' WHERE id = ?")
            .bind(approval.approved_quantity).bind(approval.transfer_item_id)
            .execute(&*db).await
            .map_err(|e| format!("Failed to approve transfer item: {}", e))?;
    }
    Ok(ApiResponse { success: true, data: Some("Transfer approved successfully".to_string()),
        message: Some("Transfer has been approved and is ready for execution".to_string()), error: None })
}

#[tauri::command]
pub async fn complete_transfer(
    request: TransferCompletionRequest,
    db: State<'_, DbPool>,
) -> Result<ApiResponse<String>, String> {
    let transfer = get_transfer_by_id(request.transfer_id, &db).await?;
    if transfer.status != "APPROVED" {
        return Ok(ApiResponse { success: false, data: None, message: None,
            error: Some("Transfer must be approved before completion".to_string()) });
    }

    for completion in &request.item_completions {
        let item = get_transfer_item_by_id(completion.transfer_item_id, &db).await?;
        if completion.transferred_quantity > 0.0 {
            create_transfer_stock_movements(&transfer, &item, completion.transferred_quantity, request.completed_by, &db).await?;
        }
        sqlx::query("UPDATE transfer_items SET transferred_quantity = ?, status = 'COMPLETED' WHERE id = ?")
            .bind(completion.transferred_quantity).bind(completion.transfer_item_id)
            .execute(&*db).await
            .map_err(|e| format!("Failed to update transfer item: {}", e))?;
    }

    sqlx::query(
        "UPDATE inventory_transfers SET status = 'COMPLETED', completed_by = ?, completed_at = ? WHERE id = ?"
    )
    .bind(request.completed_by).bind(Utc::now().naive_utc()).bind(request.transfer_id)
    .execute(&*db).await
    .map_err(|e| format!("Failed to complete transfer: {}", e))?;

    Ok(ApiResponse { success: true, data: Some("Transfer completed successfully".to_string()),
        message: Some("Inventory has been transferred between locations".to_string()), error: None })
}

pub async fn get_transfer_by_id(id: i64, db: &DbPool) -> Result<InventoryTransfer, String> {
    sqlx::query_as::<_, InventoryTransfer>(
        "SELECT id, restaurant_id, transfer_number, from_location, to_location,
         status, requested_by, approved_by, completed_by, notes, total_items,
         total_value, requested_at, approved_at, completed_at, created_at
         FROM inventory_transfers WHERE id = ?"
    )
    .bind(id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}

pub async fn get_transfer_item_by_id(id: i64, db: &DbPool) -> Result<TransferItem, String> {
    sqlx::query_as::<_, TransferItem>(
        "SELECT id, transfer_id, inventory_item_id, item_name, requested_quantity,
         approved_quantity, transferred_quantity, unit, unit_cost, status, notes
         FROM transfer_items WHERE id = ?"
    )
    .bind(id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}

pub async fn create_transfer_stock_movements(
    transfer: &InventoryTransfer,
    item: &TransferItem,
    quantity: f64,
    user_id: i64,
    db: &DbPool,
) -> Result<(), String> {
    let total_cost = item.unit_cost * quantity;
    let note_out = format!("Transfer OUT from {} to {} - {}", transfer.from_location, transfer.to_location, transfer.transfer_number);
    let note_in = format!("Transfer IN from {} to {} - {}", transfer.from_location, transfer.to_location, transfer.transfer_number);
    let transfer_id = transfer.id.unwrap_or(0);

    sqlx::query(
        "INSERT INTO stock_movements (restaurant_id, inventory_item_id, movement_type,
         quantity, unit_cost, total_cost, reference_type, reference_id, notes, user_id, movement_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(transfer.restaurant_id).bind(item.inventory_item_id).bind("TRANSFER")
    .bind(-quantity).bind(item.unit_cost).bind(-total_cost)
    .bind("INVENTORY_TRANSFER_OUT").bind(transfer_id).bind(&note_out).bind(user_id).bind(Utc::now().naive_utc())
    .execute(db).await.map_err(|e| format!("Failed to create OUT movement: {}", e))?;

    sqlx::query(
        "INSERT INTO stock_movements (restaurant_id, inventory_item_id, movement_type,
         quantity, unit_cost, total_cost, reference_type, reference_id, notes, user_id, movement_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(transfer.restaurant_id).bind(item.inventory_item_id).bind("IN")
    .bind(quantity).bind(item.unit_cost).bind(total_cost)
    .bind("INVENTORY_TRANSFER_IN").bind(transfer_id).bind(&note_in).bind(user_id).bind(Utc::now().naive_utc())
    .execute(db).await.map_err(|e| format!("Failed to create IN movement: {}", e))?;

    Ok(())
}

pub async fn get_item_cost(item_id: i64, db: &DbPool) -> Result<f64, String> {
    sqlx::query_scalar::<_, f64>("SELECT cost_price FROM inventory_items WHERE id = ?")
        .bind(item_id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}

pub async fn get_item_name(item_id: i64, db: &DbPool) -> Result<String, String> {
    sqlx::query_scalar::<_, String>("SELECT name FROM inventory_items WHERE id = ?")
        .bind(item_id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}

pub async fn get_item_unit(item_id: i64, db: &DbPool) -> Result<String, String> {
    sqlx::query_scalar::<_, String>("SELECT base_unit FROM inventory_items WHERE id = ?")
        .bind(item_id).fetch_one(db).await.map_err(|e| format!("Database error: {}", e))
}
