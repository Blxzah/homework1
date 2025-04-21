const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'insecure-secret',
    resave: false,
    saveUninitialized: true
}));

// Database
let users = [
    { id: 1, username: 'ziyad', password: 'pass123', role: 'user' },
    { id: 2, username: 'yahya', password: 'pass123', role: 'user' },
    { id: 3, username: 'admin', password: 'admin123', role: 'admin' }
];

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/profile');
    }
    res.send(`
        <h1>Login</h1>
        <form action="/login" method="POST">
            <input type="text" name="username" placeholder="Username">
            <input type="password" name="password" placeholder="Password">
            <button type="submit">Login</button>
        </form>
        <p>Test accounts: yahya:pass123, admin:admin123</p>
    `);
});
//verefication login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        req.session.user = user;
        res.redirect('/profile');
    } else {
        res.send('Invalid credentials! <a href="/">Try again</a>');
    }
});

// Profile Page with Role Modification Vulnerability
app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    res.send(`
        <h1>Welcome, ${req.session.user.username}</h1>
        <p>Your role: ${req.session.user.role}</p>
        
        
        <form action="/update-profile" method="POST">
            <input type="hidden" name="id" value="${req.session.user.id}">
            <label>Username: <input type="text" name="username" value="${req.session.user.username}"></label><br>
           
            <button type="submit">Update Profile</button>
        </form>
        
        ${req.session.user.role === 'admin' ? 
            `<a href="/admin">Access Admin Panel</a><br>` : ''}
        
        <a href="/logout">Logout</a>
    `);
});

// Admin Panel
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send(`
            <h1>Access Denied</h1>
            <p>Only admins can view this page</p>
            <a href="/profile">Back to profile</a>
        `);
    }
    
    res.send(`
        <h1>Admin Panel</h1>
        <p>Welcome, ${req.session.user.username} (admin)</p>
        
        <h2>User Management</h2>
        <table border="1">
            <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Action</th>
            </tr>
            ${users.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>
                        <form action="/delete-user" method="POST" style="display:inline">
                            <input type="hidden" name="userId" value="${user.id}">
                            <button type="submit">Delete</button>
                        </form>
                    </td>
                </tr>
            `).join('')}
        </table>
        <br>
        <a href="/profile">Back to Profile</a>
    `);
});

// Vulnerable Update Endpoint (No Role Validation)
app.post('/update-profile', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    req.session.user.username = req.body.username;

    const userIndex = users.findIndex(u => u.id === parseInt(req.body.id));
    if (userIndex !== -1) {
        users[userIndex].username = req.body.username;
    }

    res.redirect('/profile');
});


// Admin Delete Function (Can delete any account including self)
app.post('/delete-user', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send('Access denied!');
    }
    
    const userId = parseInt(req.body.userId);
    users = users.filter(u => u.id !== userId);
    
    // If admin deleted themselves, log them out
    if (userId === req.session.user.id) {
        req.session.destroy();
        return res.redirect('/');
    }
    
    res.redirect('/admin');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));