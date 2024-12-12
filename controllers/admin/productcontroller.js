
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

const getAllproducts = async (req, res) => {
    try {
        const search = req.query.search || ""
        const page = req.query.page || 1;
        const limit = 2;

        const productData = await Product.find({
             
            productName: {$regex:new RegExp(".*"+search+".*","i") } 
             
        
        }) .limit(limit *1)
            .skip((page -1)*limit)
            .populate('category')
            .exec();
         console.log(productData)   


            const count =await Product.find({
                productName:{$regex:new RegExp(".*"+search+".*","i")}
            }).countDocuments();

            const category=await Category.find({isListed:true});
            if(category){
                res.render('products',{
                    data:productData,
                    currentPage:page,
                    totalPages:Math.ceil(count/limit),
                    cat:category,
                })
            }
            else{
                res.render('pageError');
            }
    }
    catch(error){
        res.redirect('/admin/pageError')

    }
}

const blockProduct=async(req,res)=>{
    try{
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        console.log("blocked products");
        res.redirect('/admin/products');
    }
    catch(error){
        console.log("error in block product");
        res.redirect('/admin/pageError')
    }
}

const UnblockProduct=async(req,res)=>{
    try{
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        console.log("blocked products");
        res.redirect('/admin/products');
    }
    catch(error){
        console.log("error in block product");
         res.redirect('/admin/pageError')
    }
}


const geteditProduct=async(req,res)=>{
    try{
        const id=req.query.id;
        const product=await Product.findOne({_id:id});
        const category=await Category.find({})
        res.render('edit-product',{
            product:product,
            category:category,

        });
        console.log("edit-product page loaded succesfully")
    }
    catch(error){
        res.redirect('/admin/pageError');
        console.log("edit-product admin side side load error")


    }
}








module.exports={
    loadProductaddpage,
    addProducts,
    getAllproducts,
    UnblockProduct,
    blockProduct,
    geteditProduct
}