const path = require('path');
const fs = require('fs'); 
const sharp = require('sharp');
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");



const addProducts = async (req, res) => {
  try {
    const productData = req.body;

    const existingProduct = await Product.findOne({ productName: productData.productName });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'Product already exists, please try another name' });
    }

    const processedImages = [];
    
   
    if (req.files && req.files.length > 0) {
      const uploadDirectory = path.join('public', 'uploads', 'product-images');
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true }); 
      }

      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path; 
        const uniqueFileName = req.files[i].filename; 

        
        const buffer = await sharp(originalImagePath)
          .resize({ width: 440, height: 440, fit: sharp.fit.cover })
          .sharpen({ sigma: 1.5 })
          .jpeg({ quality: 95 })
          .toColourspace('srgb')
          .toBuffer();

        
        await fs.promises.writeFile(originalImagePath, buffer);

        processedImages.push(`/uploads/product-images/${uniqueFileName}`);
      }
    } else {
      return res.status(400).json({ success: false, message: 'At least one image is required' });
    }

    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category name' });
    }

    const newProduct = new Product({
      productName: productData.productName,
      description: productData.description,
      category: category._id,
      regularPrice: Number(productData.regularPrice),
      salePrice: Number(productData.salePrice),
      createdOn: new Date(),
      quantity: Number(productData.quantity),
      productImage: processedImages,
      status: 'Available'
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: 'Product added successfully' });
  } catch (error) {
    console.error('Error while adding product:', error);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again later.', error: error.message });
  }
};





const loadProductaddpage = async (req, res) => {
  try {
    const categoryItems = await Category.find({ isListed: true });

    if (!categoryItems.length) {
      console.log("No categories found");
    }

    res.render("product-add", { Category: categoryItems });
  } catch (error) {
    console.error("Error loading product add page:", error);
    res.redirect("/admin/pageError");
  }
};


const geteditProduct = async (req, res) => {
  try {
    const id = req.query.id;

    const product = await Product.findOne({ _id: id }).populate('category');
    const category = await Category.find({});

    res.render("edit-product", {
      Product: product,
      Category: category,
    });
  } catch (error) {
    res.redirect("/admin/pageError");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const productData = req.body;

    const product = await Product.findById(id);
    if (!product) {
      console.log("Product not found");
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const existingProduct = await Product.findOne({
      productName: productData.productName,
      _id: { $ne: id },
    });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists, please try another name'
      });
    }

   
    let processedImages = [...product.productImage];

   
    if (productData.removedImages) {
      const removedImages = JSON.parse(productData.removedImages);
      removedImages.forEach((imagePath) => {
       
        const index = processedImages.indexOf(imagePath);
        if (index > -1) {
          processedImages.splice(index, 1);
        }
        
        const filePath = path.join(__dirname, '../../public', imagePath);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete file ${filePath}:`, err);
        });
      });
    }

    
    if (req.files && req.files.length > 0) {
      const uploadDirectory = path.join('public', 'uploads', 'product-images');
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }

      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const uniqueFileName = req.files[i].filename;

        const buffer = await sharp(originalImagePath)
          .resize({ width: 440, height: 440, fit: sharp.fit.cover })
          .sharpen({ sigma: 1.5 })
          .jpeg({ quality: 95 })
          .toColourspace('srgb')
          .toBuffer();

        await fs.promises.writeFile(originalImagePath, buffer);

        processedImages.push(`/uploads/product-images/${uniqueFileName}`);
      }
    }

    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category name' });
    }

    
    product.productName = productData.productName;
    product.description = productData.description;
    product.category = category._id;
    product.regularPrice = Number(productData.regularPrice);
    product.salePrice = Number(productData.salePrice);
    product.quantity = Number(productData.quantity);
    product.productImage = processedImages;
    product.status = 'Available';

    await product.save();
    res.status(200).json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error while editing product:', error);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again later.', error: error.message });
  }
};
const getAllproducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 5;

    const productData = await Product.find({
      productName: { $regex: new RegExp(".*" + search + ".*", "i") },
    })
    .sort({ createdOn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.find({
      productName: { $regex: new RegExp(".*" + search + ".*", "i") },
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    if (category) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
      });
    } else {
      res.render("pageError");
    }
  } catch (error) {
    res.redirect("/admin/pageError");
  }
};

const blockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });

    res.json({
      success: true,
      message: `Product ${product.productName} blocked successfully`,
      productId: id,
      type: 'block' 
    });
  } catch (error) {
    console.error("Error blocking product:", error);
    res.status(500).json({
      success: false,
      message: 'Error blocking product'
    });
  }
};

const UnblockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });

    res.json({
      success: true,
      message: `Product ${product.productName} unblocked successfully`,
      productId: id,
      type: 'unblock' 
    });
  } catch (error) {
    console.error("Error unblocking product:", error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking product'
    });
  }
};


const addProductOffer = async (req, res) => {
  try {
    const { productId, discountPercentage, startDate, endDate } = req.body;

  
    if (discountPercentage < 1 || discountPercentage > 99) {
      return res
        .status(400)
        .json("Discount percentage must be between 1 and 99");
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json("End date must be after start date");
    }

    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json("Product not found");
    }

    product.offer = { discountPercentage, startDate, endDate };
    await product.save();

    res.status(200).json("Offer added successfully");
  } catch (error) {
    console.error(error);
    res.status(500).json("Failed to add offer");
  }
};


const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;

   
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json("Product not found");
    }

    product.offer = null; 
    await product.save();

    res.status(200).json("Offer removed successfully");
  } catch (error) {
    console.error(error);
    res.status(500).json("Failed to remove offer");
  }
};


module.exports = {
  loadProductaddpage,
  addProducts,
  getAllproducts,
  UnblockProduct,
  blockProduct,
  geteditProduct,
  editProduct,
  removeProductOffer,
  addProductOffer,
};
