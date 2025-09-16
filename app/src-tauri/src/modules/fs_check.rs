use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn cross_platform_fs_check() -> Result<bool, String> {
    let base = dirs::data_dir().ok_or("No data dir")?;
    let test_dir = base.join("FoodPaaji").join("fs_check");
    fs::create_dir_all(&test_dir).map_err(|e| e.to_string())?;
    let test_file = test_dir.join("touch.txt");
    fs::write(&test_file, b"ok").map_err(|e| e.to_string())?;
    let read = fs::read(&test_file).map_err(|e| e.to_string())?;
    Ok(read == b"ok")
}
