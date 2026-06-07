// controllers/studentController.js
// Request handlers - validates input, calls model, sends response

const Student = require('../models/studentModel');

// GET /students - Returns all students
exports.getAllStudents = (req, res) => {
    Student.findAll((err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
        res.status(200).json(rows);
    });
};

// GET /students/:id - Returns one student by ID
exports.getStudentById = (req, res) => {
    Student.findById(req.params.id, (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
        if (!row) return res.status(404).json({ success: false, message: 'Student not found' });
        res.status(200).json(row);
    });
};

// POST /students - Create a new student
exports.createStudent = (req, res) => {
    const { name, email, course } = req.body;

    // Validate required fields
    if (!name || !email || !course) {
        return res.status(400).json({
            success: false,
            message: 'Name, Email and Course are required'
        });
    }

    // Check if email is already taken
    Student.findByEmail(email, (err, existing) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
        if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

        // Save the new student
        Student.create({ name, email, course }, (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
            res.status(201).json({ success: true, message: 'Student Added Successfully' });
        });
    });
};

// PUT /students/:id - Update an existing student
exports.updateStudent = (req, res) => {
    const { name, email, course } = req.body;
    const id = req.params.id;

    // Validate required fields
    if (!name || !email || !course) {
        return res.status(400).json({
            success: false,
            message: 'Name, Email and Course are required'
        });
    }

    // Check student exists
    Student.findById(id, (err, student) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        // If email changed, check it is not taken by another student
        if (email !== student.email) {
            Student.findByEmail(email, (err, existing) => {
                if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
                if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
                doUpdate(id, { name, email, course }, res);
            });
        } else {
            doUpdate(id, { name, email, course }, res);
        }
    });
};

// Helper to run the actual update query
function doUpdate(id, data, res) {
    Student.update(id, data, (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
        res.status(200).json({ success: true, message: 'Student Updated Successfully' });
    });
}

// DELETE /students/:id - Delete a student
exports.deleteStudent = (req, res) => {
    const id = req.params.id;

    Student.findById(id, (err, student) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        Student.delete(id, (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
            res.status(200).json({ success: true, message: 'Student Deleted Successfully' });
        });
    });
};
