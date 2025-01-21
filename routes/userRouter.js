const express = require("express");
const router = express.Router();
const passport = require("passport");

const usercontroller = require("../controllers/user/usercontroller");
const productcontroller = require("../controllers/user/productcontroller");
const profilecontroller = require("../controllers/user/profilecontroller");
const cartcontroller = require("../controllers/user/cartcontroller");
const checkoutcontroller = require("../controllers/user/checkoutcontroller");
const { UserAuth, AdminAuth } = require("../middlewares/auth");
const Product = require("../models/productSchema");

//page error
router.get("/pageNotFound", usercontroller.pageNotFound);

//signup login section
router.get("/signup", usercontroller.loadSignup);
router.post("/signup", usercontroller.signup);
router.get("/login", usercontroller.loadlogin);
router.post("/login", usercontroller.login);

//otp verification
router.post("/verify-otp", usercontroller.verifyOtp);
router.post("/resend-otp", usercontroller.resendOtp);

//forgot-password

router.get("/forgot-password", usercontroller.loadforgot);
router.post("/resetPassword", usercontroller.emailvalid);

//forgot password otp verficatoon
router.post("/forgot-password/verify-otp", usercontroller.verifyPassOtp);
router.post("/forgot-password/resend-otp", usercontroller.PassresendOtp);
router.get("/reset-Password", usercontroller.loadresetPassword);
//forgot password reset

router.post("/reset-Password", usercontroller.resetPassword);

//home page and logout
router.get("/", UserAuth, usercontroller.loadhomepage);
router.get("/logout", usercontroller.logout);

//shop page && products
router.get("/shop", UserAuth, usercontroller.loadShopPage);
router.get("/productdetails", UserAuth, productcontroller.productDetails);

//cart
router.get("/cart", UserAuth, cartcontroller.loadCart);
router.post("/cart-add", UserAuth, cartcontroller.addtoCart);
router.post("/removeCart", UserAuth, cartcontroller.removeCart);
router.post("/updateQuantity", UserAuth, cartcontroller.updateQuantity);

//checkout
router.get("/checkout", UserAuth, checkoutcontroller.loadCheckout);
//place-Order
router.post("/place-order", UserAuth, checkoutcontroller.placeOrder);
//Order Success
router.get("/order-success", UserAuth, checkoutcontroller.orderSuccess);

//order cancel
// Cancel order route
router.post("/api/orders/:orderId/cancel",UserAuth,checkoutcontroller.cancelOrder);
router.post("/api/orders/:orderId/product/:productId/cancel",UserAuth,checkoutcontroller.cancelProductOrder);

//userProfile
router.get("/userProfile", UserAuth, profilecontroller.userProfile);
router.post("/userProfile", UserAuth, profilecontroller.userUpdate);

router.get("/password", UserAuth, profilecontroller.password);
router.post("/password", UserAuth, profilecontroller.UpdatePassword);

router.get("/addressManagement", UserAuth, profilecontroller.addressManagement);
router.post("/addAddress", UserAuth, profilecontroller.addAddress);
router.get("/editAddress", UserAuth, profilecontroller.editAddress);
router.post("/updateAddress", UserAuth, profilecontroller.updateAddress);
router.get("/deleteAddress", UserAuth, profilecontroller.deleteAddress);

router.get("/orders", UserAuth, profilecontroller.orders);

// Google authentication route
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google authentication callback route
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  usercontroller.googleAuth // Use the googleAuth method from usercontroller
);

module.exports = router;
