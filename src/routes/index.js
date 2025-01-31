const express = require('express');
const router = express.Router();



router.get('/', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/auth/login', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/auth/register', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/auth/confirm', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/auth/logout', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/home', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/home/edit', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/home/registerfinish', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/admin/users', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.post('/admin/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/service/user', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/skin/{uuid}', (req, res) => {
    res.send('Welcome to the Express app!');
});

router.get('/cape/{uuid}', (req, res) => {
    res.send('Welcome to the Express app!');
});



module.exports = router;