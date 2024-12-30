const Product=require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const Address=require('../../models/addressSchema');
const User=require('../../models/userSchema');
const bcrypt=require("bcrypt");


const userProfile=async (req,res)=>{
    try{
        const userId=req.session.user;
        const userData=await User.findOne({_id:userId});
        if(userId){
            console.log("user profile load successfully")
            return res.render('userProfile',{user:userData});

      }
       }
    catch(error){
        console.log("errror in passing the user data to user  profile")

    }
}

const userUpdate=async (req,res)=>{
    try{
        console.log("updateProfile");
        const userId=req.session.user;
        const { name, email, phone } = req.body;
        console.log('Received Data:', { name, email, phone });
   
        await User.updateOne({_id:userId},{$set:{fullname:name,phone:phone}});
        const updateUser= await User.findById(userId);
        console.log('update user',updateUser);

        console.log(updateUser)
        if(updateUser){
            console.log("user profile udated succesfully");
            return res.render('userProfile',{user:updateUser});
        }
        
        

    }
    catch(error){
         console.log("Error in updating the user profile:", error);
        res.status(500).send("An error occurred while updating the profile.");

    }
}



const password=async(req,res)=>{
    try{
        const userId=req.session.user;
        const userData=await User.findOne({_id:userId});
         if(userId){
            console.log("password page load successfully")
            return res.render('password',{user:userData});

      }


    }
    catch(error){
        console.log("errror in loading password page");

    }
}


const UpdatePassword=async(req,res)=>{
    try{
        console.log(req.body);
        const {currentPassword,newPassword,confirmPassword}=req.body;
         if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match" });
        }
        const userId=req.session.user;
        const userData=await User.findOne({_id:userId});
        
        const passwordMatch=await bcrypt.compare(currentPassword,userData.password)
        if(!passwordMatch){
            console.log("password doesn't match")
           return res.status(400).json({ message: "password doesn't match" });

        }
        const hashedpassword=await bcrypt.hash(newPassword,10);
        userData.password=hashedpassword;
        await userData.save();

         return res.status(200).json({ message: "Password updated successfully" });


    }
    catch(error){
        return res.status(500).json({ message: "Internal server error" });

    }
}




const addressManagement=async(req,res)=>{
    try{
        const userId=req.session.user;
        const userData=await User.findOne({_id:userId});
         if(userId){
            console.log("address page load successfully")
            return res.render('addressManagement',{user:userData});

      }


    }
    catch(error){
        console.log("errror in loading addressManagement page");

    }

}
const addAddress=async(req,res)=>{
    try{

    }
    catch(error){

    }
}



module.exports={
    userProfile,
    userUpdate,
    password,
    UpdatePassword,
    addressManagement,
    addAddress
  
}