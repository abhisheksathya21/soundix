const Products=require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const User=require('../../models/userSchema');
const fs=require('fs');
const path=require('path');

const sharp=require('sharp');
const Product = require('../../models/productSchema');

const loadProductaddpage = async (req, res) => {
    try {
        const categoryItems = await Category.find({ isListed: true });

        
        if (!categoryItems.length) {
            console.log("No categories found");
        }
      
        res.render('product-add', { Category: categoryItems });
        console.log("Add new product page loaded with categories:", categoryItems);
    } catch (error) {
        console.error("Error loading product add page:", error);
        res.redirect('/admin/pageError');
    }
}

// const addProducts=async(req,res)=>{
//     try{
//         const product=req.body;
//         console.log("the product from req.body",product);
//         const existingProduct= await Products.findOne({
//             productName:product.productName
            
//         });
//         if(!existingProduct){
//             const images=[];

//             if(req.files && req.files.length>0){
//                 for(let i=0;i<req.files.length;i++){
//                     const originalImagePath=req.files[i].path;
                    
//                     const resizedImagePath=path.join('public','uploads','productimages',req.files[i].filename);
//                     await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
//                     images.push(req.files[i].filename);
//                 }
//             }
//             const categoryId=await Category.findOne({productName:products.category});
            
//             if(!categoryId){
//                 return res.status(400).join("Invalid category name")
//             }
//             const newProduct=new Products({
//                 productName:product.productName,
//                 description:product.description,
//                 category:categoryId._id,
//                 regularPrice:product.regularPrice,
//                 salePrice:product.salePrice,
//                 createdOn:new Date(),
//                 quantity:product.quantity,
//                 color:product.color,
//                 productImage:images,
//                 status:'Available',
//             })
        
//             await newProduct.save();
//             return res.redirect("/admin/addProducts");
        
        
        
//         }
//         else{
//             return res.status(400).json("the product already exists")
//         }

//     }
//     catch(error){
//         console.log("error saving product",error);
//         return res.redirect('/admin/pageError')
//     }
// }
const addProducts = async (req, res) => {
  try {
      const products = req.body;

      // Check if product name already exists
      const productExists = await Product.findOne({ productName: products.productName });
      if (productExists) {
          return res.status(400).json({ error: "Product already exists" });
      }

      const images = [];
      if (req.files && req.files.length > 0) {
          const uploadDir = path.join("public", "uploads", "product-images");

          if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
          }

          for (let i = 0; i < req.files.length; i++) {
              const originalImagePath = req.files[i].path;
              const fileExt = path.extname(req.files[i].originalname);
              const uniqueName = `${Date.now()}-${i}${fileExt}`;
              const resizedImagePath = path.join(uploadDir, uniqueName);

              await sharp(originalImagePath)
                  .resize({ width: 440, height: 440, fit: sharp.fit.cover })
                  .jpeg({ quality: 90 })
                  .toFile(resizedImagePath);

              images.push(`/uploads/product-images/${uniqueName}`);
          }
      }

      // Validate category
      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
          return res.status(400).json({ error: "Invalid category" });
      }

      const newProduct = new Product({
          productName: products.productName,
          description: products.description,
          category: categoryId._id,
          regularPrice: products.regularPrice,
          salePrice: products.salePrice,
          quantity: products.quantity,
          productImage: images,
          status: "Available",
          createdOn: new Date(),
      });

      await newProduct.save();
      console.log("product saved succesfully",newProduct)
      res.redirect("/admin/products");
  } catch (error) {
      console.error("Error saving product:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};








module.exports={
    loadProductaddpage,
    addProducts
}