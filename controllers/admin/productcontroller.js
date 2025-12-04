const path = require('path');
const fs = require('fs'); 
const sharp = require('sharp');
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");



const cloudinary = require('../../config/cloudinary');
const addProducts = async (req, res) => {
  console.log("=== ADD PRODUCT START ===");
  console.log("Body:", req.body);
  
  try {
    const productData = req.body;

    // Check for existing product
    const existingProduct = await Product.findOne({ productName: productData.productName });
    if (existingProduct) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product already exists, please try another name' 
      });
    }

    // Validate images - now it's an array directly
    if (!productData.images || !Array.isArray(productData.images) || productData.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }

    console.log(`Processing ${productData.images.length} images...`);

    // Upload base64 images to Cloudinary
    const uploadPromises = productData.images.map(async (base64Image, index) => {
      try {
        console.log(`Uploading image ${index + 1}/${productData.images.length}...`);
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: 'beats-product-images',
          format: 'jpg',
          transformation: [
            { 
              width: 1200, 
              height: 1200, 
              crop: 'limit',
              quality: 'auto:best'
            }
          ],
          flags: 'progressive',
          resource_type: 'image'
        });
        console.log(`Image ${index + 1} uploaded successfully`);
        return result.secure_url;
      } catch (uploadError) {
        console.error(`Error uploading image ${index}:`, uploadError);
        throw new Error(`Failed to upload image ${index + 1}: ${uploadError.message}`);
      }
    });

    let processedImages;
    try {
      processedImages = await Promise.all(uploadPromises);
      console.log('All images uploaded successfully');
    } catch (uploadError) {
      return res.status(500).json({
        success: false,
        message: uploadError.message || 'Failed to upload images to Cloudinary'
      });
    }

    // Validate category
    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid category name' 
      });
    }

    // Create new product
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
    console.log('Product saved successfully');
    
    return res.status(201).json({ 
      success: true, 
      message: 'Product added successfully' 
    });

  } catch (error) {
    console.error('Error while adding product:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.', 
      error: error.message 
    });
  }
}



const loadProductaddpage = async (req, res) => {
  try {
    console.log("load product page");
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
  console.log("=== EDIT PRODUCT START ===");
  console.log("Body:", req.body);
  
  try {
    const id = req.params.id;
    const productData = req.body;

    // 1. Fetch product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // 2. Check for duplicate product name
    const existingProduct = await Product.findOne({
      productName: productData.productName,
      _id: { $ne: id }
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists'
      });
    }

    // 3. Handle images
    let processedImages = [];

    // Get existing images from productData.existingImages
    if (productData.existingImages && Array.isArray(productData.existingImages)) {
      processedImages = [...productData.existingImages];
    }

    // 4. Upload new base64 images if any
    if (productData.newImages && Array.isArray(productData.newImages) && productData.newImages.length > 0) {
      console.log(`Uploading ${productData.newImages.length} new images...`);
      
      const uploadPromises = productData.newImages.map(async (base64Image, index) => {
        try {
          console.log(`Uploading new image ${index + 1}...`);
          const result = await cloudinary.uploader.upload(base64Image, {
            folder: 'beats-product-images',
            format: 'jpg',
            transformation: [
              { 
                width: 1200, 
                height: 1200, 
                crop: 'limit',
                quality: 'auto:best'
              }
            ],
            flags: 'progressive',
            resource_type: 'image'
          });
          console.log(`New image ${index + 1} uploaded successfully`);
          return result.secure_url;
        } catch (uploadError) {
          console.error(`Error uploading image ${index}:`, uploadError);
          throw new Error(`Failed to upload image ${index + 1}: ${uploadError.message}`);
        }
      });

      try {
        const newUploadedImages = await Promise.all(uploadPromises);
        processedImages = [...processedImages, ...newUploadedImages];
        console.log('All new images uploaded successfully');
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: uploadError.message || 'Failed to upload new images'
        });
      }
    }

    // 5. Validate at least one image
    if (processedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }

    // 6. Validate category
    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category name'
      });
    }

    // 7. Update fields
    product.productName = productData.productName;
    product.description = productData.description;
    product.category = category._id;
    product.regularPrice = Number(productData.regularPrice);
    product.salePrice = Number(productData.salePrice);
    product.quantity = Number(productData.quantity);
    product.productImage = processedImages;
    product.status = "Available";

    // 8. Save
    await product.save();
    console.log('Product updated successfully');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Error while editing product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
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
    .sort({ createdOn: 1 })
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
