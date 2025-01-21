const User=require('../../models/userSchema');
const Category= require('../../models/categorySchema');
const Product=require('../../models/productSchema');
const nodemailer=require('nodemailer');
const env=require('dotenv').config();
const bcrypt=require("bcrypt");



const pageNotFound= async(req,res)=>{
    try {
      res.render("pageNotFound", {
        user: req.user || null,
        message:
          "Oops! The page you're looking for doesn't exist. Please check the URL or return to the homepage.",
      });
    } catch (error) {
      console.error("Error loading 404 page", error);
      res.status(500).send("Internal Server Error");
    }
}

const googleAuth = async (req, res) => {
  try {
    const user = req.user; 

    if (!user) {
      throw new Error("User not found in req.user");
    }

    if (user.isBlocked) {
      return res.render("login", { message: "User is blocked by the admin" });
    }

  
    req.session.user = user._id;

    
    res.redirect("/");
  } catch (error) {
    console.error("Google Authentication Error:", error);
    res.redirect("/login");
  }
};



const loadhomepage=async(req,res)=>{
    try{ 
        const userId=req.session.user;
        const categories= await Category.find({isListed:true});
        let productData=await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
        }) 
       
        


        if(userId){
            const userData=await User.findOne({_id:userId})
           
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
      return res.render("login", {
        message:
          "We couldn't find an account with this email. Please try again or sign up.",
      });
    }
    if (findUser.isBlocked) {
      return res.render("login", {
        message:
          "Your account has been disabled. Please contact support for assistance.",
      });
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
    return res.render("forgot-password", { message });
  }
  catch(error){
    console.log("error occured while loading forgot password")
  }
}

const emailvalid=async(req,res)=>{
  try{
  
    const {email}=req.body;
   console.log(email);
    const findUser = await User.findOne({email:email});
    if(findUser){
      console.log("User found");
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

   
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found in session. Please restart the process.",
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

    
    if (!req.session.userPassOtp) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }

    
    if (otpInput === req.session.userPassOtp) {
     
      console.log("OTP verified successfully");
      req.session.userPassOtp = null;
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully. You may proceed.",
      });
    } else {
      
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
      return res.render("reset-Password");
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
    
      return res.render("signup",{
        message:"user with this phone number exists"
      })

    }

    const otp = generateOtp();
    console.log("Generated OTP:", otp);

    
    const emailsent = await sendVerificationEmail(email, otp);
    if (!emailsent) {
      console.log("Email sending failed");
      return res.json({ error: "Email sending failed" });
    }

    
    req.session.userOtp = otp;
    req.session.userData = { fullname, email, phone, password };
    console.log("OTP sent and session stored successfully:", otp);

    
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
   console.log("reset password");
    const email = req.session.email;
   console.log(email);
    const {newPassword}=req.body;
    console.log(newPassword);
    if (!email) {
      console.log("Email not found in session");
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
    console.log("Password updated successfully");
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

        
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

       
        const sortParam = req.query.sort || "newest";
        const categorySlug = req.query.category || null;

        // Fetch categories and ensure they're listed
        const categories = await Category.find({ isListed: true });

        // Base filter
        const productFilter = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };

        // Add category filter if selected
        if (categorySlug) {
            const category = await Category.findOne({ slug: categorySlug });
            if (category) {
                productFilter.category = category._id;
            }
        }

        // Define sort criteria
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

        // Get total products count for pagination
        const totalProducts = await Product.countDocuments(productFilter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch products
        const products = await Product.find(productFilter)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit)
            .populate('category');

        // Generate pagination URLs helper function
        const generatePageUrl = (pageNum) => {
            const baseUrl = '/shop?';
            const params = new URLSearchParams();
            
            if (pageNum) params.append('page', pageNum);
            if (sortParam) params.append('sort', sortParam);
            if (categorySlug) params.append('category', categorySlug);
            
            return baseUrl + params.toString();
        };

        // Generate pagination links
        const paginationLinks = [];
        for (let i = 1; i <= totalPages; i++) {
            paginationLinks.push({
                page: i,
                active: i === page,
                url: generatePageUrl(i)
            });
        }

        // Update breadcrumbs to include category if selected
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' }
        ];

        if (categorySlug) {
            const category = categories.find(cat => cat.slug === categorySlug);
            if (category) {
                breadcrumbs.push({ name: category.name, url: '' });
            }
        }

        res.render('shop', {
            user: userId ? await User.findOne({ _id: userId }) : null,
            products,
            categories,
            currentCategory: categorySlug,
            currentSort: sortParam,
            breadcrumbs,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                links: paginationLinks,
                totalProducts
            },
            generatePageUrl
        });

    } catch (error) {
        console.error('Error loading shop page:', error);
        res.redirect('/pageNotFound');
    }
};

// Helper function to generate pagination URLs
const generatePageUrl = (req, pageNum) => {
  const url = new URL(req.protocol + "://" + req.get("host") + req.originalUrl);
  url.searchParams.set("page", pageNum);
  return url.pathname + url.search;
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