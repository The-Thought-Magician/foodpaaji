use sqlx::{migrate::MigrateDatabase, Pool, Sqlite, SqlitePool};
use std::path::PathBuf;

pub type DbPool = Pool<Sqlite>;

pub async fn init_database() -> Result<DbPool, Box<dyn std::error::Error>> {
    let db_path = get_database_path()?;
    let db_url = format!("sqlite://{}", db_path.display());
    
    if !Sqlite::database_exists(&db_url).await.unwrap_or(false) {
        log::info!("Creating database at {}", db_path.display());
        Sqlite::create_database(&db_url).await?;
    }
    
    // Basic retry for initial connection
    let mut attempts = 0;
    let pool = loop {
        match SqlitePool::connect(&db_url).await {
            Ok(p) => break p,
            Err(e) if attempts < 3 => {
                attempts += 1;
                log::warn!("DB connect attempt {} failed: {}", attempts, e);
                tokio::time::sleep(std::time::Duration::from_millis(200 * attempts)).await;
                continue;
            }
            Err(e) => return Err(Box::new(e)),
        }
    };
    
    log::info!("Running database migrations");
    sqlx::migrate!("./migrations").run(&pool).await?;
    
    log::info!("Database initialized successfully");
    Ok(pool)
}

fn get_database_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // Use OS data directory; avoid tauri v1 path API
    let base = dirs::data_dir().ok_or("Could not get data directory")?;
    let app_dir = base.join("FoodPaaji");
    std::fs::create_dir_all(&app_dir)?;
    Ok(app_dir.join("foodpaaji.db"))
}

pub fn get_app_data_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let base = dirs::data_dir().ok_or("Could not get data directory")?;
    let app_dir = base.join("FoodPaaji");
    std::fs::create_dir_all(&app_dir)?;
    Ok(app_dir)
}

pub async fn get_connection() -> Result<DbPool, Box<dyn std::error::Error>> {
    let db_path = get_database_path()?;
    let db_url = format!("sqlite://{}", db_path.display());
    
    let pool = SqlitePool::connect(&db_url).await?;
    Ok(pool)
}