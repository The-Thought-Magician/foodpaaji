CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    clock_in DATETIME,
    clock_out DATETIME,
    break_start DATETIME,
    break_end DATETIME,
    total_hours REAL,
    status TEXT NOT NULL DEFAULT 'PRESENT',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    UNIQUE(employee_id, date)
);

CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);