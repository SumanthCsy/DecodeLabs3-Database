// models/studentModel.js
// Database query functions - all raw SQL operations live here

const { getDb } = require('../config/database');

const Student = {
    // Get all students ordered by most recently added
    findAll: (callback) => {
        getDb().all('SELECT * FROM students ORDER BY created_at DESC', [], callback);
    },

    // Get one student by ID
    findById: (id, callback) => {
        getDb().get('SELECT * FROM students WHERE id = ?', [id], callback);
    },

    // Check if an email already exists in the database
    findByEmail: (email, callback) => {
        getDb().get('SELECT * FROM students WHERE email = ?', [email], callback);
    },

    // Insert a new student record
    create: (data, callback) => {
        const { name, email, course } = data;
        getDb().run(
            'INSERT INTO students (name, email, course) VALUES (?, ?, ?)',
            [name, email, course],
            function (err) {
                callback(err, this ? this.lastID : null);
            }
        );
    },

    // Update an existing student's information
    update: (id, data, callback) => {
        const { name, email, course } = data;
        getDb().run(
            'UPDATE students SET name = ?, email = ?, course = ? WHERE id = ?',
            [name, email, course, id],
            function (err) {
                callback(err, this ? this.changes : 0);
            }
        );
    },

    // Delete a student by ID
    delete: (id, callback) => {
        getDb().run('DELETE FROM students WHERE id = ?', [id], function (err) {
            callback(err, this ? this.changes : 0);
        });
    }
};

module.exports = Student;
