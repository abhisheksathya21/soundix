const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageError = async (req, res) => {
  res.render("pageError");
};

const loadLogin = async (req, res) => {
  try {
     const message = req.query.message || "";
  

    if (req.session.admin) {
      return res.render("dashboard");
    }

   
    return res.render("admin-login", { message });
  } catch (error) {
    console.error("Error occurred while loading admin login", error);
    return res.redirect("/pageError");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.redirect("/admin/login?message=Admin not found");
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (passwordMatch) {
      req.session.admin = true;
      console.log("login admin")
      return res.render("dashboard");
    } else {
      return res.redirect("/admin/login?message=Invalid credentials");
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.redirect("/pageError");
  }
};

const loadDashboard = async (req, res) => {
 
  if (req.session.admin) {
    try {
      
      return res.render("dashboard");
    } catch (error) {
      console.error("Error loading dashboard:", error);
      return res.redirect("/pageError");
    }
  } else {
    return res.redirect("/admin/login");
  }
};

const logout = async (req, res) => {
  try {
    if (req.session.admin) {
      delete req.session.admin;
    }
    return res.redirect("/admin/login?message=You have been logged out successfully");
  } catch (error) {
    console.error("Unexpected error during logout", error);
    return res.redirect("/pageError");
  }
};

module.exports = {
  login,
  loadLogin,
  loadDashboard,
  logout,
  pageError,
};
