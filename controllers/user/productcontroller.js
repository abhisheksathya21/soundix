const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.query.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    // Input validation
    if (!productId) {
      return res.status(400).send("Product ID is required");
    }

    const userData = await User.findById(userId);
    const productData = await Product.findById(productId).populate("category");

    if (!productData || productData.isBlocked || !productData.category?.isListed) {
      return res.status(404).send("Product not found or unavailable");
    }

    const categoryOffer = productData.category?.offer || null;
    const productOffer = productData.offer || null;

    let bestOffer = null;
    if (categoryOffer?.discountPercentage && productOffer?.discountPercentage) {
      bestOffer = categoryOffer.discountPercentage > productOffer.discountPercentage
        ? categoryOffer
        : productOffer;
    } else {
      bestOffer = categoryOffer || productOffer;
    }

    let finalPrice = productData.salePrice;
    if (bestOffer) {
      finalPrice = productData.salePrice - (productData.salePrice * bestOffer.discountPercentage) / 100;
    }

    
    const totalRelatedProducts = await Product.countDocuments({
      category: productData.category._id,
      _id: { $ne: productData._id },
      isBlocked: false,
    });

    let RelatedProducts = await Product.find({
      category: productData.category._id,
      _id: { $ne: productData._id },
      isBlocked: false,
    })
      .populate({
        path: "category",
        match: { isListed: true },
      })
      .skip((page - 1) * limit)
      .limit(limit);

    
    RelatedProducts = RelatedProducts.filter((product) => product.category !== null);

    if (!RelatedProducts.length) {
      console.log("No available related products found");
    }

    RelatedProducts = RelatedProducts.map((relatedProduct) => {
      const relatedCategoryOffer = relatedProduct.category?.offer || null;
      const relatedProductOffer = relatedProduct.offer || null;

      let relatedBestOffer = null;
      if (relatedCategoryOffer?.discountPercentage && relatedProductOffer?.discountPercentage) {
        relatedBestOffer = relatedCategoryOffer.discountPercentage > relatedProductOffer.discountPercentage
          ? relatedCategoryOffer
          : relatedProductOffer;
      } else {
        relatedBestOffer = relatedCategoryOffer || relatedProductOffer;
      }

      let relatedFinalPrice = relatedProduct.salePrice;
      if (relatedBestOffer) {
        relatedFinalPrice = relatedProduct.salePrice - (relatedProduct.salePrice * relatedBestOffer.discountPercentage) / 100;
      }

      return {
        ...relatedProduct._doc,
        bestOffer: relatedBestOffer,
        finalPrice: relatedFinalPrice,
      };
    });

    const totalPages = Math.ceil(totalRelatedProducts / limit);

    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Shop", url: "/shop" },
      { name: productData.productName, url: "" },
    ];

    res.render("product-details", {
      user: userData,
      product: productData,
      quantity: productData.quantity,
      category: productData.category,
      breadcrumbs,
      products: RelatedProducts,
      currentPage: page,
      totalPages,
      totalRelatedProducts,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      bestOffer,
      finalPrice,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = { productDetails };