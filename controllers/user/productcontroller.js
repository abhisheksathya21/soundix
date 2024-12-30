const Product=require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const User=require('../../models/userSchema');

const productDetails=async (req,res)=>{
    try{

        const userId=req.session.user;
        const userData=await User.findById(userId);
        const productId=req.query.id;
        const productData=await Product.findById(productId).populate('category');
         if (!productData) {
         return res.status(404).send("Product not found");
        }
        const findcategory=productData.category;
        console.log("productData",productData);
        console.log("productData.quantity",productData.quantity);
        const RelatedProducts= await Product.find({
             category: productData.category._id,
      _id: { $ne: productData._id },
        })
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'shop', url: '/shop' },
            { name: productData.productName, url: '' }, // Current page
        ];
        res.render('product-details',{
            user:userData,
            product:productData,
            quantity:productData.quantity,
            category:findcategory,
            breadcrumbs,
            RelatedProducts 

        })

    }
    catch(error){
         console.error("Error fetching product details:", error);
        res.redirect('/pageNotFound')

    }
}
module.exports={
    productDetails
}