use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Permission {
    // Employee Management
    ViewEmployees,
    CreateEmployees,
    UpdateEmployees,
    DeleteEmployees,
    ManageEmployeeRoles,
    
    // Inventory Management
    ViewInventory,
    CreateInventoryItems,
    UpdateInventoryItems,
    DeleteInventoryItems,
    ManageSuppliers,
    
    // Menu Management
    ViewMenu,
    CreateMenuItems,
    UpdateMenuItems,
    DeleteMenuItems,
    ManageCategories,
    
    // Orders & Billing
    ViewOrders,
    CreateOrders,
    UpdateOrders,
    CancelOrders,
    ProcessPayments,
    
    // Reports & Analytics
    ViewReports,
    ExportData,
    ViewAnalytics,
    
    // System Administration
    ManageSettings,
    BackupDatabase,
    RestoreDatabase,
    ManageIntegrations,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub name: String,
    pub permissions: HashSet<Permission>,
}

impl Role {
    pub fn new(name: &str, permissions: Vec<Permission>) -> Self {
        Self {
            name: name.to_string(),
            permissions: permissions.into_iter().collect(),
        }
    }

    pub fn has_permission(&self, permission: &Permission) -> bool {
        self.permissions.contains(permission)
    }
}

pub fn get_default_roles() -> Vec<Role> {
    vec![
        Role::new("MANAGER", vec![
            Permission::ViewEmployees,
            Permission::CreateEmployees,
            Permission::UpdateEmployees,
            Permission::DeleteEmployees,
            Permission::ManageEmployeeRoles,
            Permission::ViewInventory,
            Permission::CreateInventoryItems,
            Permission::UpdateInventoryItems,
            Permission::DeleteInventoryItems,
            Permission::ManageSuppliers,
            Permission::ViewMenu,
            Permission::CreateMenuItems,
            Permission::UpdateMenuItems,
            Permission::DeleteMenuItems,
            Permission::ManageCategories,
            Permission::ViewOrders,
            Permission::CreateOrders,
            Permission::UpdateOrders,
            Permission::CancelOrders,
            Permission::ProcessPayments,
            Permission::ViewReports,
            Permission::ExportData,
            Permission::ViewAnalytics,
            Permission::ManageSettings,
            Permission::BackupDatabase,
            Permission::RestoreDatabase,
            Permission::ManageIntegrations,
        ]),
        
        Role::new("CHEF", vec![
            Permission::ViewInventory,
            Permission::UpdateInventoryItems,
            Permission::ViewMenu,
            Permission::CreateMenuItems,
            Permission::UpdateMenuItems,
            Permission::ManageCategories,
            Permission::ViewOrders,
            Permission::UpdateOrders,
        ]),
        
        Role::new("WAITER", vec![
            Permission::ViewMenu,
            Permission::ViewOrders,
            Permission::CreateOrders,
            Permission::UpdateOrders,
            Permission::ProcessPayments,
        ]),
        
        Role::new("CASHIER", vec![
            Permission::ViewMenu,
            Permission::ViewOrders,
            Permission::CreateOrders,
            Permission::ProcessPayments,
            Permission::ViewReports,
        ]),
        
        Role::new("SOUS_CHEF", vec![
            Permission::ViewInventory,
            Permission::CreateInventoryItems,
            Permission::UpdateInventoryItems,
            Permission::ViewMenu,
            Permission::CreateMenuItems,
            Permission::UpdateMenuItems,
            Permission::ViewOrders,
            Permission::UpdateOrders,
        ]),
        
        Role::new("BARTENDER", vec![
            Permission::ViewInventory,
            Permission::UpdateInventoryItems,
            Permission::ViewMenu,
            Permission::ViewOrders,
            Permission::CreateOrders,
            Permission::UpdateOrders,
            Permission::ProcessPayments,
        ]),
        
        Role::new("CLEANER", vec![
            Permission::ViewOrders,
        ]),
        
        Role::new("DELIVERY", vec![
            Permission::ViewOrders,
            Permission::UpdateOrders,
        ]),
    ]
}

pub fn get_role_permissions(role_name: &str) -> HashSet<Permission> {
    let roles = get_default_roles();
    roles.iter()
        .find(|role| role.name == role_name.to_uppercase())
        .map(|role| role.permissions.clone())
        .unwrap_or_default()
}

pub fn check_permission(user_role: &str, required_permission: Permission) -> bool {
    let permissions = get_role_permissions(user_role);
    permissions.contains(&required_permission)
}

pub fn serialize_permissions(permissions: &HashSet<Permission>) -> String {
    serde_json::to_string(permissions).unwrap_or_default()
}

pub fn deserialize_permissions(permissions_str: &str) -> HashSet<Permission> {
    serde_json::from_str(permissions_str).unwrap_or_default()
}