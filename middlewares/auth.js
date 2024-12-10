const User=require('../models/userSchema');

const UserAuth=async (req,res,next)=>{
    try{
        console.log("user Auth session checking",req.session.user);
         if(req.session.user){
        const data=await User.findById(req.session.user);
        console.log("data");
        if(data && !data.isBlocked){
           return  next();
        }
    }
    else{
        res.redirect('/login');
    }

    }
    catch(error){
        console.error("Error in userAuth middleware:", error);
        res.status(500).send("Internal Server Error");
    }
   
}


const AdminAuth=async(req,res,next)=>{
    try{
        if(req.session.admin){
            const data= await User.findOne({isAdmin:true})
            if(data){
                return next()

            }
            else{
                res.redirect('admin/login')
            }
        }
    }
    catch(error){
        console.error("Error in AdminAuth middleware:", error);
        res.status(500).send("Internal Server Error");

    }
}


module.exports={
    AdminAuth,
    UserAuth
}