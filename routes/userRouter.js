const express = require("express");
const router = express.Router();
const passport = require("passport");

const usercontroller = require("../controllers/user/usercontroller");
const productcontroller = require("../controllers/user/productcontroller");
const profilecontroller = require("../controllers/user/profilecontroller");
const cartcontroller = require("../controllers/user/cartcontroller");
const checkoutcontroller = require("../controllers/user/checkoutcontroller");
const ordercontroller = require("../controllers/user/ordercontroller");
const wishlistcontroller = require("../controllers/user/wishlistcontroller");
const walletcontroller = require("../controllers/user/walletcontroller");
const { UserAuth, AdminAuth } = require("../middlewares/auth");
const Product = require("../models/productSchema");

// Page error
router.get("/pageNotFound", usercontroller.pageNotFound);

// Signup login section
router.get("/signup", usercontroller.loadSignup);
router.post("/signup", usercontroller.signup);
router.get("/login", usercontroller.loadlogin);
router.post("/login", usercontroller.login);

// OTP verification
router.post("/verify-otp", usercontroller.verifyOtp);
router.post("/resend-otp", usercontroller.resendOtp);

// Forgot password
router.get("/forgot-password", usercontroller.loadforgot);
router.post("/resetPassword", usercontroller.emailvalid);

// Forgot password OTP verification
router.post("/forgot-password/verify-otp", usercontroller.verifyPassOtp);
router.post("/forgot-password/resend-otp", usercontroller.PassresendOtp);
router.get("/reset-Password", usercontroller.loadresetPassword);
// Forgot password reset
router.post("/reset-Password", usercontroller.resetPassword);

// Home page and logout
router.get("/", UserAuth, usercontroller.loadhomepage);
router.get("/logout", usercontroller.logout);

// Shop page && products
router.get("/shop", UserAuth, usercontroller.loadShopPage);
router.get("/productdetails", UserAuth, productcontroller.productDetails);

// Cart
router.get('/cart/count',UserAuth,cartcontroller.cartcount)
router.get("/cart", UserAuth, cartcontroller.loadCart);
router.post("/cart-add", UserAuth, cartcontroller.addtoCart);
router.post(
  "/cart-add-from-wishlist",
  UserAuth,
  cartcontroller.addToCartFromWishlist
);
router.post("/removeCart", UserAuth, cartcontroller.removeCart);
router.post("/updateQuantity", UserAuth, cartcontroller.updateQuantity);
router.get("/validate-cart", UserAuth, cartcontroller.validateCart);

// Wishlist
router.get('/wishlist/count',UserAuth,wishlistcontroller.wishlistcount);
router.get("/wishlist", UserAuth, wishlistcontroller.loadWishlist);
router.post("/wishlist/toggle", UserAuth, wishlistcontroller.toggleWishlist);
router.post(
  "/wishlist/remove",
  UserAuth,
  wishlistcontroller.removeFromWishlist
);
router.get("/wishlist/state", UserAuth, wishlistcontroller.getWishlistState);

// Checkout
router.get("/checkout", UserAuth, checkoutcontroller.loadCheckout);
router.post("/validate-coupon", UserAuth, checkoutcontroller.validateCoupon);
// Place Order
router.post("/place-order", UserAuth, checkoutcontroller.placeOrder);
router.post("/retry-payment", UserAuth, checkoutcontroller.retryPayment);
router.post("/verify-payment", UserAuth, ordercontroller.verifyPayment);
router.post("/payment-dismissed", UserAuth, ordercontroller.paymentDismissed);
router.get("/get-wallet-balance", UserAuth, walletcontroller.getWalletBalance);

// Order Success
router.get("/order-success", UserAuth, ordercontroller.orderSuccess);

// Order cancel
router.post(
  "/api/orders/:orderId/cancel",
  UserAuth,
  ordercontroller.cancelOrder
);

router.post(
  "/admin/cancel-order-product",
  UserAuth,
  ordercontroller.cancelProductOrder
);
router.get(
  "/api/orders/:orderId/invoice",
  UserAuth,
  ordercontroller.getOrderForInvoice
);
router.get(
  "/api/orders/:orderId/invoice-pdf",
  UserAuth,
  ordercontroller.generateInvoicePDF
); // New route

// Return requests
router.post(
  "/api/orders/return-product",
  UserAuth,
  ordercontroller.createReturnRequest
);
router.post(
  "/admin/process-return",
  UserAuth,
  ordercontroller.processReturnRequest
);

// User Profile
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

// Wallet
router.get("/wallet", UserAuth, walletcontroller.wallet);
router.post("/add-money", UserAuth, walletcontroller.addMoney);
router.post("/verify-recharge", UserAuth, walletcontroller.verifyRecharge);

// Google authentication route
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  usercontroller.googleAuth
);

module.exports = router;
