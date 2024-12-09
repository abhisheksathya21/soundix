const express=require('express');
const router=express.Router();
const passport=require('passport')
const usercontroller=require('../controllers/user/usercontroller')
const {UserAuth,AdminAuth}=require('../middlewares/auth')


router.get('/pageNotFound',usercontroller.pageNotFound) 
router.get('/',UserAuth,usercontroller.loadhomepage);
router.get('/signup',usercontroller.loadSignup);
router.post('/signup',usercontroller.signup);
router.get('/login',usercontroller.loadlogin);
router.post('/login',usercontroller.login);

router.get('/logout',usercontroller.logout);


router.post('/verify-otp',usercontroller.verifyOtp);
router.post("/resend-otp",usercontroller.resendOtp);

router.get('/', (req, res) => {
  res.send("Welcome to the homepage");
});

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/signup' }), // Failure redirection
  (req, res) => {
    console.log("Authentication Successfull",req.user)
    res.redirect('/'); 
  }
);
module.exports=router;









