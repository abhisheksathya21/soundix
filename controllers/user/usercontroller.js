const User=require('../../models/userSchema');
const Category= require('../../models/categorySchema');
const Product=require('../../models/productSchema');
const nodemailer=require('nodemailer');
const env=require('dotenv').config();
const bcrypt=require("bcrypt");



const pageNotFound= async(req,res)=>{
    try {
      res.render("pageNotFound", { user: null });
    } catch (error) {
      console.error("Error loading 404 page", error);
      res.status(500).send("Internal Server Error");
    }
}

const loadhomepage=async(req,res)=>{
    try{ 
        const userId=req.session.user;
        const categories= await Category.find({isListed:true});
        let productData=await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
        }) 
       
        


        console.log("loadhome page req.session.user",req.session.user)
        console.log("user",userId)
        if(userId){
            const userData=await User.findOne({_id:userId})
            console.log("userData",userData)
            return res.render('home',{user:userData,products:productData});


        }
        else{
            return res.render('home',{user:null,products:productData});
        }
        
    }

    catch(error){
        console.log('Home page not found')
        res.redirect('/pageNotFound')

    }
}

const loadSignup=async(req,res)=>{
    try{
        return res.render('Signup',{user:null})
    }
    catch(error){
        console.log('login page not found',error);
        res.status(500).send('server error')
    }

}
const loadlogin = async (req, res) => {
    try {
        const message = req.query.message; // Get the message from the query parameter
        if (!req.session.user) {
            return res.render('login', { user: null, message }); // Pass the message to the login page
        } else {
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.render("login", { message: "User Not Found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by the admin" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Password doesn't match" });
    }

    req.session.user = findUser._id;
    res.redirect("/");
  } catch (error) {
    console.log("Login error", error);
    res.render("login", { message: "Please try again later" });
  }
};


const logout=async(req,res)=>{
    try{
        req.session.destroy((error)=>{
            if(error){
                console.log("the session doesnt destroyed there is an error");
                return res.redirect('/pageNotFound');
            }
            
                console.log("the session destroyed succesfully");
                return res.redirect('/login?message=You have been logged out successfully');
            
        })

    }
    catch(error){
        console.log("logout error",error);
        res.redirect('/pageNotFound')

    }
}



//otp generator
function generateOtp(){
    return Math.floor(100000 +Math.random()*900000).toString();
}


//Signup verification email
async function sendVerificationEmail(email,otp){
    try{
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `<b><h1>Your OTP is ${otp}</h1><b>`,
            html: `<b><h3>Your OTP: ${otp}</h3></b>`,
        });
        
        return info.accepted.length>0
        
    }catch(error){

        console.error("Error sending email",error);
        return false

    }
}

//Email for forgot password reset 

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

const loadforgot=async(req,res)=>{
  try{
    const message=req.query.message;
    return res.render('forgot-password',{message});
  }
  catch(error){
    console.log("error occured while loading forgot password")
  }
}

const emailvalid=async(req,res)=>{
  try{
  
    const {email}=req.body;
   
    const findUser = await User.findOne({email:email});
    if(findUser){
      const otp = generateOtp();
      const emailSent = await resetPasswordEmail(email,otp)
      if(emailSent){
        req.session.email=email;
        req.session.userPassOtp=otp;
        res.render("forgot-PassOtp",{message:'OTP sent successfully to your email'});
        console.log("Reset Password Otp :",otp);
      }
      else{
        res.redirect("/forgot-password?message=Failed to send otp please try again");
        console.log("failed to sent otp");
      }
    }
    else{
      res.render('forgot-password',{message:"User with this email does not exist"})
    }

  }
  catch(error){
    console.error("forgot pasword otp sent error:", error);
    res.redirect("/pageNotFound");

  }
  
}

const PassresendOtp = async (req, res) => {
  try {
    const email = req.session.email;

    // Check if email is present in the session
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in session. Please restart the process.",
      });
    }

    // Generate a new OTP and update the session
    const otp = generateOtp();
    req.session.userPassOtp = otp;

    // Resend the OTP via email
    const emailSent = await resetPasswordEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      return res.status(200).json({
        success: true,
        message: "OTP resent successfully. Please check your email.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again.",
    });
  }
};

const verifyPassOtp = async (req, res) => {
  try {
    const { otpInput } = req.body;

    // Check if the OTP exists in the session
    if (!req.session.userPassOtp) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }

    // Compare the input OTP with the session OTP
    if (otpInput === req.session.userPassOtp) {
      // OTP verified successfully
      console.log("OTP verified successfully");
      req.session.userPassOtp = null; // Clear OTP from session for security
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully. You may proceed.",
      });
    } else {
      // Incorrect OTP
      console.log("Invalid OTP");
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again.",
    });
  }
};

const loadresetPassword=async(req,res)=>{
  try{
      return res.render("reset-password");
  }
  catch(error){
    console.log("reset password page load errorr ")

  }
}


const signup = async (req, res) => {
  try {
    const { fullname, email, phone, password, confirm_password } = req.body;

    if (!fullname || !email || !phone || !password || !confirm_password) {
      console.log("All fields are required");
      return res.render("signup", { message: "All fields are required" });
    }

    if (password !== confirm_password) {
      console.log("Passwords do not match");
      return res.render("signup", { message: "Passwords do not match" });
    }

    console.log("Signup attempt with email:", email);

    // Check if user already exists
    const finduser = await User.findOne({ email });
    if (finduser) {
      console.log("User already exists");
      return res.render("signup", {
        user: finduser,
        message: "User with this email already exists",
      });
    }
    const findphone= await User.findOne({phone});
    if(findphone){
      console.log("this phone number alresy  exist");
      return res.render("signup",{
        message:"user with this phone number exists"
      })

    }

    const otp = generateOtp();
    console.log("Generated OTP:", otp);

    // Send verification email
    const emailsent = await sendVerificationEmail(email, otp);
    if (!emailsent) {
      console.log("Email sending failed");
      return res.json({ error: "Email sending failed" });
    }

    // Store OTP and user data in session
    req.session.userOtp = otp;
    req.session.userData = { fullname, email, phone, password };
    console.log("OTP sent and session stored successfully:", otp);

    // Notify user OTP was sent successfully
    res.render("verify-otp", {
      message: "OTP sent successfully to your email.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.redirect("/pageNotFound");
  }
};





const securePassword=async(password)=>{
    try{
        const passwordHash=await bcrypt.hash(password,10)
        console.log(passwordHash)
        return passwordHash
    }
    catch(error){
        console.log("securePassword error",error)

    }
}




const verifyOtp = async (req, res) => {
    try {
        console.log("Request body", req.body);
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
            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found  in session" });
    }
    const otp = generateOtp();
    req.session.userOtp = otp;
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("resend OTP:", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP resend Successfully" });
    } else {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to Resend OTP. Please try again ",
        });
    }
  } catch (error) {
    console.log("Error resending OTP", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Erorr.Please try again",
      });
  }
};


const resetPassword = async (req, res) => {
  try {
   
    const email = req.session.email;
    console.log("Email from session:", email);
    const {newPassword}=req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in session",
      });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );

    delete req.session.email;
    delete req.session.userOtp;

   return res.redirect('/login?message=Password updated Successfully');
  } catch (error) {
    console.error("Error in password reset:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later",
    });
  }
};
const loadShopPage = async (req, res) => { 
  try {
    const userId = req.session.user;
    const categories = await Category.find({ isListed: true });

    // Retrieve the `sort` query parameter (default to 'newest')
    const sortParam = req.query.sort || 'newest';

  
    let sortCriteria;
    switch (sortParam) {
      case 'priceLowHigh':
        sortCriteria = { salePrice: 1 };
        break;
      case 'priceHighLow':
        sortCriteria = { salePrice: -1 }; 
        break;
      case 'newest':
        sortCriteria = { createdOn: -1 }; 
        break;
      case 'popular':
        sortCriteria = { popularity: -1 }; 
        break;
      case 'aToZ':
        sortCriteria = { productName: 1 }; 
        break;
      case 'zToA':
        sortCriteria = { productName: -1 }; 
        break;
      default:
        sortCriteria = { createdAt: -1 }; 
    }

    // Fetch the products with the determined sort criteria
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    }).sort(sortCriteria);

    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Shop', url: '' }, 
    ];

    
    if (userId) {
      const userData = await User.findOne({ _id: userId });
      return res.render('shop', {
        user: userData,
        products: productData,
        breadcrumbs,
        currentSort: sortParam, 
      });
    } else {
      return res.render('shop', {
        user: null,
        products: productData,
        breadcrumbs,
        currentSort: sortParam, 
      });
    }
  } catch (error) {
    console.log("Error loading shop page:", error);
    res.redirect('/pageNotFound');
  }
};



module.exports = {
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