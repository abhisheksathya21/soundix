const express=require('express');
const router=express.Router();
const passport=require('passport')
const usercontroller=require('../controllers/user/usercontroller');
const productcontroller=require('../controllers/user/productcontroller')
const profilecontroller=require('../controllers/user/profilecontroller')
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



//home page and logout
router.get('/',UserAuth,usercontroller.loadhomepage);
router.get('/logout',usercontroller.logout);



//shop page && products
router.get('/shop',UserAuth,usercontroller.loadShopPage);
router.get('/productdetails',UserAuth,productcontroller.productDetails);


//userProfile
router.get('/userProfile',UserAuth,profilecontroller.userProfile);
router.post('/userProfile',UserAuth,profilecontroller.userUpdate);

router.get('/password',UserAuth,profilecontroller.password);
router.post('/password',UserAuth,profilecontroller.UpdatePassword);


router.get('/addressManagement',UserAuth,profilecontroller.addressManagement);
router.post('/addAddress',UserAuth,profilecontroller.addAddress);










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









