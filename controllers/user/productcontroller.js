const product=require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const User=require('../../models/userSchema');

const productDetails=async (req,res)=>{
    try{

        const userId=req.session.user;
        const userData=await User.findById(userId);
        const productId=req.query.id;
        const product=await Product.findById(productId).populate('category');
        const findcategory=product.category;
        res.render('product-details',{
            user:userData,
            product:product,
            quantity:product.quantity,
            category:findcategory

        })

    }
    catch(error){
        console.log("product detail page render error");
        res.redirect('/pageNotFound')

    }
}
module.exports={
    productDetails
}