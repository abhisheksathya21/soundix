const User=require('../../models/userSchema');
const mongoose=require('mongoose')
const bcrypt=require('bcrypt');



const pageError=async(req,res)=>{
    res.render('pageError')

}

const loadlogin=async(req,res)=>{
    try{
        console.log("load admin login");
        console.log("req.session.admin",req.session.admin)
         if(req.session.admin){
            return res.redirect('/admin/dashboard')
         } 
         console.log("admin-login loaded succesfully" )
         return res.render('admin-login',{message:null})
    }
    catch(error){
        console.log("error occured while loading adminlogin",error)
    }
   
}
const login=async(req,res)=>{
    try{
        console.log("req.body",req.body);
        const {email,password}=req.body;
        const admin=await User.findOne({email,isAdmin:true});
        if(admin){
            const passwordMatch=bcrypt.compare(password,admin.password)
            if(passwordMatch){
                console.log(req.session.admin,"admin session set up with true")
                req.session.admin=true;
                return res.redirect('/admin');
            }
            else{
                return res.redirect('/login');
            }
        }else{
            return res.redirect('/login')
        }

    }
    catch(error){
        console.log("error found ",error);

    }
}
const loaddashboard = async (req, res) => {
    console.log("req.session.admin:", req.session.admin);
    if (req.session.admin) {
        try {
            console.log("The dashboard page loaded successfully");
            return res.render('dashboard');
        } catch (error) {
            console.error("Error loading dashboard:", error);
            return res.redirect('/pageError');
        }
    } else {
        return res.redirect('/login');
    }
};

    const logout=async(req,res)=>{
        try{
            req.session.destroy((error)=>{
                if(error){
                    console.log("error in the admin session destroy",error);

                }
                console.log("admin logout successfully");
                res.redirect('/admin/login')
            })
        }
        catch(error){
            console.log("unexpected error during logout")
            res.redirect('/pageError')
        }
        
    }
   




module.exports={
    login,
    loadlogin,
    loaddashboard,
    logout,
    pageError
}