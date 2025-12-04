const User=require('../models/userSchema');

const UserAuth = async (req, res, next) => {
  try {
   
    if (req.session.user) {
      const user = await User.findById(req.session.user);

      // Check if user exists and is not blocked
      if (user && !user.isBlocked) {
       
        return next();
      } else {
        console.log("User is blocked, logging out");
        req.session.destroy((err) => {
          if (err) {
            console.error("Error while destroying session:", err);
          }
          res.redirect("/login?message=Your account has been blocked.");
        });
        return; 
      }
    } else {
      
      res.redirect("/login"); 
    }
  } catch (error) {
    console.error("Error in UserAuth middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};



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