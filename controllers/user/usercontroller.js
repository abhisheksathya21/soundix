const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
  try {
    res.render("pageNotFound", {
      user: req.user || null,
      message: "Oops! The page you're looking for doesn't exist. Please check the URL or return to the homepage.",
      icon: "warning",
    });
  } catch (error) {
    console.error("Error loading 404 page", error);
    res.status(500).send("Internal Server Error");
  }
};

const googleAuth = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      throw new Error("User not found in req.user");
    }

    if (user.isBlocked) {
      return res.render("login", {
        message: "User is blocked by the admin",
        icon: "warning",
      });
    }

    req.session.user = user._id;
    res.redirect("/?message=Logged in with Google successfully&icon=success");
  } catch (error) {
    console.error("Google Authentication Error:", error);
    res.redirect("/login?message=Google login failed&icon=warning");
  }
};

const loadhomepage = async (req, res) => {
  try {
    const userId = req.session.user;
    const message = req.query.message;
    const icon = req.query.icon || "warning"; 
    const categories = await Category.find({ isListed: true });

    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    }).populate("category");

    const updatedProducts = productData.map((product) => {
      const categoryOffer = product.category?.offer || null;
      const productOffer = product.offer || null;
      const bestOffer =
        [categoryOffer, productOffer]
          .filter((offer) => offer?.discountPercentage)
          .sort((a, b) => b.discountPercentage - a.discountPercentage)[0] || null;

      let basePrice = product.salePrice ?? product.regularPrice ?? 0;
      let finalPrice = basePrice;

      if (bestOffer) {
        let discountAmount = (basePrice * bestOffer.discountPercentage) / 100;
        discountAmount = Math.min(discountAmount, basePrice);
        finalPrice = basePrice - discountAmount;
      }

      return {
        ...product.toObject(),
        bestOffer,
        finalPrice,
      };
    });

    const userData = userId ? await User.findOne({ _id: userId }) : null;

    return res.render("home", { user: userData, products: updatedProducts, message, icon });
  } catch (error) {
    console.log("Home page not found", error);
    res.redirect("/pageNotFound?message=Home page failed to load&icon=warning");
  }
};

const loadSignup = async (req, res) => {
  try {
    const message = req.query.message;
    const icon = req.query.icon || "warning";
    return res.render("signup", { user: null, message, icon });
  } catch (error) {
    console.log("Signup page not found", error);
    res.redirect("/pageNotFound?message=Signup page failed to load&icon=warning");
  }
};

const loadlogin = async (req, res) => {
  try {
    const message = req.query.message;
    const icon = req.query.icon || "warning";
    if (!req.session.user) {
      return res.render("login", { user: null, message, icon });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound?message=Login page failed to load&icon=warning");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.render("login", {
        message: "We couldn't find an account with this email. Please try again or sign up.",
        icon: "warning",
      });
    }
    if (findUser.isBlocked) {
      return res.render("login", {
        message: "Your account has been disabled. Please contact support for assistance.",
        icon: "warning",
      });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", {
        message: "Password doesn't match",
        icon: "warning",
      });
    }

    req.session.user = findUser._id;
    res.redirect("/?message=Login successful&icon=success");
  } catch (error) {
    console.log("Login error", error);
    res.render("login", {
      message: "Please try again later",
      icon: "warning",
    });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((error) => {
      if (error) {
        return res.redirect("/pageNotFound?message=Logout failed&icon=warning");
      }

      console.log("the session destroyed successfully");
      return res.redirect(
        "/login?message=You have been logged out successfully&icon=success"
      );
    });
  } catch (error) {
    console.log("logout error", error);
    res.redirect("/pageNotFound?message=Logout failed&icon=warning");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
       const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `<b><h1>Your OTP is ${otp}</h1><b>`,
      html: `<b><h3>Your OTP: ${otp}</h3></b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

async function resetPasswordEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "OTP for your password reset",
      text: `<b><h1>Your OTP is ${otp}</h1><b>`,
      html: `<b><h3>Your OTP: ${otp}</h3></b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

const loadforgot = async (req, res) => {
  try {
    const message = req.query.message;
    const icon = req.query.icon || "warning"; 
    return res.render("forgot-password", { message, icon });
  } catch (error) {
    console.log("Error occurred while loading forgot password", error);
    res.redirect("/pageNotFound?message=Forgot password page failed to load&icon=warning");
  }
};

const emailvalid = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(email);
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      console.log("User found");
      const otp = generateOtp();
      const emailSent = await resetPasswordEmail(email, otp);
      if (emailSent) {
        req.session.email = email;
        req.session.userPassOtp = otp;
        res.render("forgot-PassOtp", {
          message: "OTP sent successfully to your email",
          icon: "success",
        });
        console.log("Reset Password OTP:", otp);
      } else {
        res.redirect(
          "/forgot-password?message=Failed to send OTP. Please try again&icon=warning"
        );
        console.log("Failed to send OTP");
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exist",
        icon: "warning",
      });
    }
  } catch (error) {
    console.error("Forgot password OTP send error:", error);
    res.redirect("/pageNotFound?message=Error sending OTP&icon=warning");
  }
};

const PassresendOtp = async (req, res) => {
  try {
    const email = req.session.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in session. Please restart the process.",
        icon: "warning",
      });
    }

    const otp = generateOtp();
    req.session.userPassOtp = otp;

    const emailSent = await resetPasswordEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      return res.status(200).json({
        success: true,
        message: "OTP resent successfully. Please check your email.",
        icon: "success",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
        icon: "warning",
      });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again.",
      icon: "warning",
    });
  }
};

const verifyPassOtp = async (req, res) => {
  try {
    const { otpInput } = req.body;
    console.log("otpInput received:", otpInput);
    console.log("session userPassOtp:", req.session.userPassOtp);

    if (!req.session.userPassOtp) {
      console.log("Session expired");
      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
        icon: "warning",
      });
    }

    console.log("reached OTP comparison...");
    if (otpInput === req.session.userPassOtp) {
      console.log("OTP matched, clearing session OTP");
      req.session.userPassOtp = null;
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully. You may proceed.",
        icon: "success",
      });
    } else {
      console.log("OTP mismatch");
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
        icon: "warning",
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again.",
      icon: "warning",
    });
  }
};

const loadresetPassword = async (req, res) => {
  try {
    return res.render("reset-Password");
  } catch (error) {
    console.log("Reset password page load error", error);
    res.redirect("/pageNotFound?message=Reset password page failed to load&icon=warning");
  }
};

const signup = async (req, res) => {
  try {
    const { fullname, email, phone, password, confirm_password } = req.body;

    if (!fullname || !email || !phone || !password || !confirm_password) {
      console.log("All fields are required");
      return res.render("signup", {
        message: "All fields are required",
        icon: "warning",
      });
    }

    if (password !== confirm_password) {
      console.log("Passwords do not match");
      return res.render("signup", {
        message: "Passwords do not match",
        icon: "warning",
      });
    }

    console.log("Signup attempt with email:", email);

    const finduser = await User.findOne({ email });
    if (finduser) {
      console.log("User already exists");
      return res.render("signup", {
        user: finduser,
        message: "User with this email already exists",
        icon: "warning",
      });
    }
    const findphone = await User.findOne({ phone });
    if (findphone) {
      return res.render("signup", {
        message: "User with this phone number already exists",
        icon: "warning",
      });
    }

    const otp = generateOtp();
    console.log("Generated OTP:", otp);

    const emailsent = await sendVerificationEmail(email, otp);
    if (!emailsent) {
      console.log("Email sending failed");
      return res.render("signup", {
        message: "Failed to send OTP. Please try again.",
        icon: "warning",
      });
    }

    req.session.userOtp = otp;
    req.session.userData = { fullname, email, phone, password };
    console.log("OTP sent and session stored successfully:", otp);

    res.render("verify-otp", {
      message: "OTP sent successfully to your email.",
      icon: "success",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.redirect("/pageNotFound?message=Signup failed&icon=warning");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(passwordHash);
    return passwordHash;
  } catch (error) {
    console.log("securePassword error", error);
  }
};

const verifyOtp = async (req, res) => {
  try {
    console.log("Stored OTP in session", req.session.userOtp);
    const { otpInput } = req.body;
    console.log(otpInput);
    if (otpInput === req.session.userOtp) {
      const { fullname, email, phone, password } = req.session.userData;
      const passwordHash = await securePassword(password);
      const saveUserData = new User({
        fullname,
        email,
        phone,
        password: passwordHash,
      });

      await saveUserData.save();
      req.session.user = saveUserData._id;
      console.log("User data saved successfully");
      res.json({ success: true, redirectUrl: "/?message=Signup successful&icon=success" });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP, please try again",
        icon: "warning",
      });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
      icon: "warning",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in session",
        icon: "warning",
      });
    }
    const otp = generateOtp();
    req.session.userOtp = otp;
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      res.status(200).json({
        success: true,
        message: "OTP resent successfully",
        icon: "success",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again",
        icon: "warning",
      });
    }
  } catch (error) {
    console.log("Error resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again",
      icon: "warning",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    console.log("Reset password");
    const email = req.session.email;
    console.log(email);
    const { newPassword } = req.body;
    console.log(newPassword);
    if (!email) {
      console.log("Email not found in session");
      return res.status(400).json({
        success: false,
        message: "Email not found in session",
        icon: "warning",
      });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
        icon: "warning",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    console.log("Password updated successfully");
    delete req.session.email;
    delete req.session.userOtp;

    return res.redirect("/login?message=Password updated successfully&icon=success");
  } catch (error) {
    console.error("Error in password reset:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later",
      icon: "warning",
    });
  }
};

const loadShopPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const sortParam = req.query.sort || "newest"; 
    const categoryId = req.query.category || null; 
    const searchQuery = req.query.search || null; 

    const categories = await Category.find({ isListed: true });

    const productFilter = {
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    };

    if (searchQuery) {
      productFilter.$or = [
        { productName: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ];
    }

    if (categoryId) {
      productFilter.category = categoryId;
    }

    let sortCriteria;
    switch (sortParam) {
      case "priceLowHigh":
        sortCriteria = { salePrice: 1 };
        break;
      case "priceHighLow":
        sortCriteria = { salePrice: -1 };
        break;
      case "aToZ":
        sortCriteria = { productName: 1 };
        break;
      case "zToA":
        sortCriteria = { productName: -1 };
        break;
      default:
        sortCriteria = { createdOn: -1 }; 
    }

    const totalProducts = await Product.countDocuments(productFilter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(productFilter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate("category");

    const updatedProducts = products.map((product) => {
      const categoryOffer = product.category?.offer || null;
      const productOffer = product.offer || null;
      const bestOffer =
        [categoryOffer, productOffer]
          .filter((offer) => offer?.discountPercentage)
          .sort((a, b) => b.discountPercentage - a.discountPercentage)[0] || null;

      let basePrice = product.salePrice ?? product.regularPrice ?? 0;
      let finalPrice = basePrice;

      if (bestOffer) {
        let discountAmount = (basePrice * bestOffer.discountPercentage) / 100;
        discountAmount = Math.min(discountAmount, basePrice);
        finalPrice = basePrice - discountAmount;
      }

      return {
        ...product.toObject(),
        bestOffer,
        finalPrice,
      };
    });

    const generatePageUrl = (pageNum) => {
      const params = new URLSearchParams();
      if (pageNum) params.append("page", pageNum);
      if (sortParam) params.append("sort", sortParam);
      if (categoryId) params.append("category", categoryId);
      if (searchQuery) params.append("search", searchQuery);
      return "/shop?" + params.toString();
    };

    const paginationLinks = [];
    for (let i = 1; i <= totalPages; i++) {
      paginationLinks.push({
        page: i,
        active: i === page,
        url: generatePageUrl(i),
      });
    }

    const breadcrumbs = [{ name: "Home", url: "/" }, { name: "Shop", url: "/shop" }];
    if (categoryId) {
      const selectedCategory = categories.find((cat) => cat._id.toString() === categoryId);
      if (selectedCategory) {
        breadcrumbs.push({ name: selectedCategory.name, url: "" });
      }
    }
    if (searchQuery) {
      breadcrumbs.push({ name: `Search: ${searchQuery}`, url: "" });
    }

    res.render("shop", {
      user: userId ? await User.findOne({ _id: userId }) : null,
      products: updatedProducts,
      categories,
      currentCategory: categoryId,
      currentSort: sortParam,
      searchQuery,
      breadcrumbs,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        links: paginationLinks,
        totalProducts,
      },
      generatePageUrl,
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.redirect("/pageNotFound?message=Shop page failed to load&icon=warning");
  }
};

const generatePageUrl = (req, pageNum) => {
  const url = new URL(req.protocol + "://" + req.get("host") + req.originalUrl);
  const params = new URLSearchParams(url.searchParams);
  params.set("page", pageNum);
  return `/shop?${params.toString()}`;
};

module.exports = {
  googleAuth,
  loadhomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadlogin,
  login,
  logout,
  loadShopPage,
  loadforgot,
  emailvalid,
  verifyPassOtp,
  PassresendOtp,
  loadresetPassword,
  resetPassword,
};

