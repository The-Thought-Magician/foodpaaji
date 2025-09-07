use sqlx::{migrate::MigrateDatabase, Pool, Sqlite, SqlitePool};
use std::path::PathBuf;
use tauri::api::path::data_dir;

pub type DbPool = Pool<Sqlite>;

pub async fn init_database() -> Result<DbPool, Box<dyn std::error::Error>> {
    let db_path = get_database_path()?;
    let db_url = format!("sqlite://{}", db_path.display());
    
    if !Sqlite::database_exists(&db_url).await.unwrap_or(false) {
        log::info!("Creating database at {}", db_path.display());
        Sqlite::create_database(&db_url).await?;
    }
    
    let pool = SqlitePool::connect(&db_url).await?;
    
    log::info!("Running database migrations");
    sqlx::migrate!("./migrations").run(&pool).await?;
    
    log::info!("Database initialized successfully");
    Ok(pool)
}

fn get_database_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let data_dir = data_dir().ok_or("Could not get data directory")?;
    let app_dir = data_dir.join("FoodPaaji");
    
    std::fs::create_dir_all(&app_dir)?;
    
    Ok(app_dir.join("foodpaaji.db"))
}

pub async fn get_connection() -> Result<DbPool, Box<dyn std::error::Error>> {
    let db_path = get_database_path()?;
    let db_url = format!("sqlite://{}", db_path.display());
    
    let pool = SqlitePool::connect(&db_url).await?;
    Ok(pool)
}