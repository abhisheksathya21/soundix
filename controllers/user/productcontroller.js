const Product=require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const User=require('../../models/userSchema');

const productDetails=async (req,res)=>{
    try{

        const userId=req.session.user;
        const userData=await User.findById(userId);
        const productId=req.query.id;
        const productData=await Product.findById(productId).populate('category');
        const findcategory=productData.category;
        console.log("productData",productData);
        console.log("productData.qyuantity",productData.qyuantity);
        res.render('product-details',{
            user:userData,
            product:productData,
            quantity:productData.quantity,
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