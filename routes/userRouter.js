const express=require('express');
const router=express.Router();
const passport=require('passport')
const usercontroller=require('../controllers/user/usercontroller');
const productcontroller=require('../controllers/user/productcontroller');
const profilecontroller=require('../controllers/user/profilecontroller');
const cartcontroller=require('../controllers/user/cartcontroller');
const checkoutcontroller=require('../controllers/user/checkoutcontroller');
const {UserAuth,AdminAuth}=require('../middlewares/auth')

//page error
router.get('/pageNotFound',usercontroller.pageNotFound);

//signup login section
router.get('/signup',usercontroller.loadSignup);
router.post('/signup',usercontroller.signup);
router.get('/login',usercontroller.loadlogin);
router.post('/login',usercontroller.login);

//otp verification
router.post('/verify-otp',usercontroller.verifyOtp);
router.post("/resend-otp",usercontroller.resendOtp);


//forgot-password

router.get("/forgot-password",usercontroller.loadforgot);
router.post("/resetPassword", usercontroller.emailvalid);

//forgot password otp verficatoon 
router.post("/forgot-password/verify-otp", usercontroller.verifyPassOtp);
router.post("/forgot-password/resend-otp",usercontroller.PassresendOtp);
router.get('/reset-Password',usercontroller.loadresetPassword);
//forgot password reset

router.post('/reset-password',usercontroller.resetPassword);

//home page and logout
router.get('/',UserAuth,usercontroller.loadhomepage);
router.get('/logout',usercontroller.logout);



//shop page && products
router.get('/shop',UserAuth,usercontroller.loadShopPage);
router.get('/productdetails',UserAuth,productcontroller.productDetails);

//cart
router.get("/cart", UserAuth, cartcontroller.loadCart);
router.post("/cart-add", UserAuth, cartcontroller.addtoCart);
router.post("/removeCart", UserAuth, cartcontroller.removeCart);
router.post("/updateQuantity", UserAuth, cartcontroller.updateQuantity);

//checkout
router.get('/checkout',UserAuth,checkoutcontroller.loadCheckout);
//place-Order
router.post("/place-order", UserAuth, checkoutcontroller.placeOrder);
//Order Success
router.get("/order-success", UserAuth, checkoutcontroller.orderSuccess);




//userProfile
router.get('/userProfile',UserAuth,profilecontroller.userProfile);
router.post('/userProfile',UserAuth,profilecontroller.userUpdate);

router.get('/password',UserAuth,profilecontroller.password);
router.post('/password',UserAuth,profilecontroller.UpdatePassword);


router.get('/addressManagement',UserAuth,profilecontroller.addressManagement);
router.post('/addAddress',UserAuth,profilecontroller.addAddress);

router.get('/editAddress',UserAuth,profilecontroller.editAddress);

router.get('/orders',UserAuth,profilecontroller.orders);










router.get('/', (req, res) => {
  res.send("Welcome to the homepage");
});

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/signup' }), // Failure redirection
  (req, res) => {
    console.log("Authentication Successfull",req.user)
    res.render('home'); 
  }
);
module.exports=router;









