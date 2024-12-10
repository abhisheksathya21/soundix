const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const pageError = async (req, res) => {
    res.render('pageError');
};

const loadLogin = async (req, res) => {
    try {
        console.log("Loading admin login");
        console.log("req.session.admin", req.session.admin);
        
        if (req.session.admin) {
            return res.render('dashboard');
        }
        
        console.log("Admin login loaded successfully");
        return res.render('admin-login', { message: null });
    } catch (error) {
        console.error("Error occurred while loading admin login", error);
        return res.redirect('/pageError');
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            return res.redirect('/admin/login');
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (passwordMatch) {
            req.session.admin = true;
            return res.render('dashboard');
        } else {
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.error("Error during login:", error);
        return res.redirect('/pageError');
    }
};

const loadDashboard = async (req, res) => {
    console.log("req.session.admin:", req.session.admin);
    
    if (req.session.admin) {
        try {
            console.log("The dashboard page loaded successfully");
            return res.render('dashboard');
        } catch (error) {
            console.error("Error loading dashboard:", error);
            return res.redirect('/pageError');
        }
    } else {
        return res.redirect('/admin/login');
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy((error) => {
            if (error) {
                console.error("Error in the admin session destroy", error);
            }
            console.log("Admin logged out successfully");
            res.redirect('/admin/login');
        });
    } catch (error) {
        console.error("Unexpected error during logout", error);
        return res.redirect('/pageError');
    }
};

module.exports = {
    login,
    loadLogin,
    loadDashboard,
    logout,
    pageError
};