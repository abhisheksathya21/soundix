const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');






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
    const productData = req.body;

    // Check if the product already exists
    const existingProduct = await Product.findOne({
      productName: productData.productName,
    });
    if (existingProduct) {
      return res.status(400).json({
        message: "Product already exists, please try with another name",
      });
    }

    const processedImages = [];
    if (req.files && req.files.length > 0) {
      const uploadDirectory = path.join("public", "uploads", "product-images");

      // Create upload directory if it doesn't exist
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }

      // Process and resize uploaded images
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const fileExtension = path.extname(req.files[i].originalname);
        const uniqueFileName = `${Date.now()}-${i}${fileExtension}`;
        const resizedImagePath = path.join(uploadDirectory, uniqueFileName);

        await sharp(originalImagePath)
          .resize({ width: 440, height: 440, fit: sharp.fit.cover })
          .sharpen({ sigma: 1.5 })
          .jpeg({ quality: 95 })
          .toColourspace("srgb")
          .toFile(resizedImagePath);

        processedImages.push(`/uploads/product-images/${uniqueFileName}`);
      }
    }

    // Validate category
    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json({
        message: "Invalid category name",
      });
    }

    // Create and save the new product
    const newProduct = new Product({
      productName: productData.productName,
      description: productData.description,
      category: category._id,
      regularPrice: productData.regularPrice,
      salePrice: productData.salePrice,
      createdOn: new Date(),
      quantity: productData.quantity,
      productImage: processedImages,
      status: "Available",
    });

    await newProduct.save();
    res.status(201).json({
      message: "Product added successfully",
    });
  } catch (error) {
    console.error("Error while adding product:", error);
    res.status(500).json({
      message: "Internal server error. Please try again later.",
      error: error.message,
    });
  }
};



const geteditProduct=async (req,res)=>{

 try{
   const id=req.query.id;
   console.log("get edit product page")
   const product=await Product.findOne({_id:id});
   const category=await Category.find({});
   console.log("edit product page loaded")
   res.render("edit-product",{
    Product:product,
    Category:category,

   })


 }
 catch(error){
  res.redirect('/admin/pageError')

 }
}

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("productId",id) 
    const productData = req.body;

    // Find the product by ID
    const product = await Product.findById({_id:id});
    if (!product) {
      console.log("product not found")
      return res.status(404).json("Product not found");
    }

    // Check if the updated product name already exists (excluding the current product)
    const existingProduct = await Product.findOne({
      productName: productData.productName,
      _id: { $ne:id },
    });
    if (existingProduct) {
      return res.status(400).json("Product with this name already exists, please try with another name");
    }

    const processedImages = product.productImage || []; // Retain existing images if no new ones are uploaded

    if (req.files && req.files.length > 0) {
      const uploadDirectory = path.join("public", "uploads", "product-images");

      // Ensure the upload directory exists
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }

      // Process new images
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const fileExtension = path.extname(req.files[i].originalname);
        const uniqueFileName = `${Date.now()}-${i}${fileExtension}`;
        const resizedImagePath = path.join(uploadDirectory, uniqueFileName);

        await sharp(originalImagePath)
          .resize({ width: 440, height: 440, fit: sharp.fit.cover })
          .sharpen({ sigma: 1.5 })
          .jpeg({ quality: 95 })
          .toColourspace("srgb")
          .toFile(resizedImagePath);

        processedImages.push(`/uploads/product-images/${uniqueFileName}`);
      }
    }

    // Find the category (optional validation, based on your requirement)
    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json("Invalid category name");
    }

    // Update product details
    product.productName = productData.productName;
    product.description = productData.description;
    product.category = category._id; // Save category ID
    product.regularPrice = productData.regularPrice;
    product.salePrice = productData.salePrice;
    product.quantity = productData.quantity;
    product.productImage = processedImages;
    product.status = "Available"; // Update status if required

    await product.save();
    res.redirect("/admin/products"); // Redirect back to the products page
  } catch (error) {
    console.error("Error while editing product:", error);
    res.redirect("/admin/pageError"); // Redirect to error page
  }
};







const getAllproducts = async (req, res) => {
    try {
        const search = req.query.search || ""
        const page = req.query.page || 1;
        const limit = 5;

        const productData = await Product.find({
             
            productName: {$regex:new RegExp(".*"+search+".*","i") } 
             
        
        }) .limit(limit *1)
            .skip((page -1)*limit)
            .populate('category')
            .exec();
         console.log("productData",productData)   


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




module.exports={
    loadProductaddpage,
    addProducts,
    getAllproducts,
    UnblockProduct,
    blockProduct,
    geteditProduct,
    editProduct
    
    
}