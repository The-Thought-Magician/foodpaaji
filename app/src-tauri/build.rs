fn main() {
    println!("cargo:rerun-if-changed=.env");
    println!("cargo:rustc-env=SQLX_OFFLINE=true");
}
