// config/database.js
// Handles SQLite database connection, table creation, and default data seeding

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Make sure the database directory exists
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'students.db');

let db;

// Connect to SQLite database, create table, and seed default data
function connectDatabase(callback) {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Database connection failed:', err.message);
            process.exit(1);
        }
        console.log('Database Connected Successfully');

        // Create the students table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                course TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
                process.exit(1);
            }
            console.log('Students Table Ready');

            // Check if table already has data
            db.get('SELECT COUNT(*) AS count FROM students', (err, row) => {
                if (err || row.count > 0) {
                    return callback();
                }

                // Insert default seed records
                const stmt = db.prepare('INSERT INTO students (name, email, course) VALUES (?, ?, ?)');
                stmt.run('Sumanth Csy', 'sumanth@gmail.com', 'Full Stack Development');
                stmt.run('Prasanna Gundaveni', 'prasanna@gmail.com', 'Web Development');
                stmt.finalize(() => callback());
            });
        });
    });
}

// Return the active database connection
function getDb() {
    return db;
}

module.exports = { connectDatabase, getDb };
