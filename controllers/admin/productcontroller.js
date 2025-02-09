const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

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

const addProducts = async (req, res) => {
  try {
    const productData = req.body;

   
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

     
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }

    
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

    
    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json({
        message: "Invalid category name",
      });
    }

   
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

const geteditProduct = async (req, res) => {
  try {
    const id = req.query.id;

    const product = await Product.findOne({ _id: id });
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

    // Find the product by ID
    const product = await Product.findById({ _id: id });
    if (!product) {
      console.log("product not found");
      return res.status(404).json("Product not found");
    }

  
    const existingProduct = await Product.findOne({
      productName: productData.productName,
      _id: { $ne: id },
    });
    if (existingProduct) {
      return res
        .status(400)
        .json(
          "Product with this name already exists, please try with another name"
        );
    }

    const processedImages = product.productImage || []; 

    if (req.files && req.files.length > 0) {
      const uploadDirectory = path.join("public", "uploads", "product-images");

     
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

    const category = await Category.findOne({ name: productData.category });
    if (!category) {
      return res.status(400).json("Invalid category name");
    }

    
    product.productName = productData.productName;
    product.description = productData.description;
    product.category = category._id;
    product.regularPrice = productData.regularPrice;
    product.salePrice = productData.salePrice;
    product.quantity = productData.quantity;
    product.productImage = processedImages;
    product.status = "Available";

    await product.save();
    res.redirect("/admin/products"); 
  } catch (error) {
    console.error("Error while editing product:", error);
    res.redirect("/admin/pageError"); 
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
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    console.log("blocked products");
    res.redirect("/admin/products");
  } catch (error) {
    console.log("error in block product");
    res.redirect("/admin/pageError");
  }
};

const UnblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    console.log("blocked products");
    res.redirect("/admin/products");
  } catch (error) {
    console.log("error in block product");
    res.redirect("/admin/pageError");
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

    product.offer = null; // Remove the offer
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
