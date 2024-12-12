const User=require('../../models/userSchema');
const Category= require('../../models/categorySchema');
const Product=require('../../models/productSchema');
const nodemailer=require('nodemailer');
const env=require('dotenv').config();
const bcrypt=require("bcrypt");



const pageNotFound= async(req,res)=>{
    try{
        res.render('pageNotFound',{user:null})
    }
    catch(error){
        console.error("Error loading 404 page", error);
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
const loadlogin=async(req,res)=>{
    try{
        console.log( "load signin req.session.user:",req.session.user)
        if(!req.session.user){
        return res.render('login',{user:null})
    }
    else{
        res.redirect('/');

    }
    }
    catch(error){
        res.redirect('/pageNotFound');
    }
    
}
const login=async(req,res)=>{
    try{
        const {email,password}=req.body;
        console.log(email,password);
        const findUser=await User.findOne({email});
        console.log("findUser",findUser)
        if(!findUser){
            console.log("user not found")
            return res.render('login',{message:"User Not Found"})
        }
        if(findUser.isBlocked){
            console.log("user is blocked by the admin ")
            return res.render('login',{message:"User is blocked by the user"})
        }
        const passwordMatch= await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            console.log("password doesn't match")
            return res.render('login',{message:"password doesn't match"})
        }
        console.log("session user id  before assignment findUser._id",findUser._id)
        req.session.user=findUser._id;
        console.log("session user id  after assignment req.session.user",req.session.user)
        console.log("req session user",req.session.user)
        console.log("finduser_id",findUser._id);
        console.log("user found and logined Successfully")
        res.redirect('/');

    }
    catch(error){
        console.log("the login credentials are not correct")
        res.render('login',{message:"Please try again later"})

    }
    



}

const logout=async(req,res)=>{
    try{
        req.session.destroy((error)=>{
            if(error){
                console.log("the session doesnt destroyed there is an error");
                return res.redirect('/pageNotFound');
            }
            
                console.log("the session destroyed succesfully");
                return res.redirect('/login');
            
        })

    }
    catch(error){
        console.log("logout error",error);
        res.redirect('/pageNotFound')

    }
}

function generateOtp(){
    return Math.floor(100000 +Math.random()*900000).toString();
}

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
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });
        
        return info.accepted.length>0
        
    }catch(error){

        console.error("Error sending email",error);
        return false

    }
}



const signup=async(req,res)=>{
    try{
        console.log(req.body)
        const {fullname,email,phone,password,confirm_password}=req.body;
        console.log(fullname);
        console.log(confirm_password);
        console.log(password)
        console.log("signup attempt with eamil:",email)

        if(password!==confirm_password){
            console.log("password do not match");

            return res.render('signup',{message:"password do not match"});
        }


        const finduser= await User.findOne({email});


       if(finduser){
        console.log("User already exists");
        return res.render('signup',{message:"user with this email already exsts"})
       }


       const otp=generateOtp();
       console.log("Generated OTP:", otp); 

       const emailsent=await sendVerificationEmail(email,otp);


       if(!emailsent){
        console.log("Email sending failed");
        return res.json('email-error')
       }


       req.session.userOtp=otp;
       req.session.userData={fullname,email,phone,password};
       console.log("OTP sent and session stored successfully:", otp);
       res.render('verify-otp');
       console.log('Otp sent',otp);
    }
    catch(error){
        console.log("signup error",error)
        res.redirect("/pageNotFound")

    }
}




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


const resendOtp=async (req,res)=>{
    try{
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found  in session"});
        }
        const otp=generateOtp();
        req.session.userOtp=otp;
        const emailSent= await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP resend Successfully"})
        }
        else{
            res.status(500).json({success:false,message:"Failed to Resend OTP. Please try again "})
        }
    }
    catch(error){
        console.log("Error resending OTP",error);
        res.status(500).json({success:false,message:"Internal Server Erorr.Please try again"})
    }
}

const loadShopPage=async (req,res)=>{
    try{
        const userId=req.session.user;
         const categories= await Category.find({isListed:true});
        let productData=await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
        }) 
         

         console.log("user",userId)
        if(userId){
            const userData=await User.findOne({_id:userId})
            console.log("userData",userData)
            return res.render('shop',{user:userData,products:productData});


        }
        else{
            return res.render('shop',{user:null,products:productData});
        }
    }
    catch(error){
        console.log("error loading shop page");
        res.redirect('/pageNotFound');
    }
}

module.exports={
     loadhomepage,
     pageNotFound,
     loadSignup,
     signup,
     verifyOtp,
     resendOtp,
     loadlogin,
     login,
     logout,
     loadShopPage
     
}