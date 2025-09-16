use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

fn secret() -> String {
    env::var("FOODPAAJI_JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-me".to_string())
}

#[tauri::command]
pub fn generate_jwt(subject: String, expires_in_seconds: u64) -> Result<String, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let claims = Claims {
        sub: subject,
        exp: (now + expires_in_seconds) as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret().as_bytes()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn verify_jwt(token: String) -> Result<Claims, String> {
    let data = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(secret().as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| e.to_string())?;
    Ok(data.claims)
}
