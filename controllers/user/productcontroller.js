const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.query.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // Number of related products per page

    const userData = await User.findById(userId);
    const productData = await Product.findById(productId).populate("category");

    if (!productData) {
      return res.status(404).send("Product not found");
    }

    // Fetch category and product-level offers for main product
    const categoryOffer = productData.category?.offer || null;
    const productOffer = productData.offer || null;

    // Determine best offer for main product
    let bestOffer = null;
    if (categoryOffer?.discountPercentage && productOffer?.discountPercentage) {
      bestOffer =
        categoryOffer.discountPercentage > productOffer.discountPercentage
          ? categoryOffer
          : productOffer;
    } else {
      bestOffer = categoryOffer || productOffer;
    }

    // Calculate final price for main product
    let finalPrice = productData.salePrice;
    if (bestOffer) {
      finalPrice =
        productData.salePrice -
        (productData.salePrice * bestOffer.discountPercentage) / 100;
    }

    // Find related products with pagination
    const totalRelatedProducts = await Product.countDocuments({
      category: productData.category._id,
      _id: { $ne: productData._id },
    });

    let RelatedProducts = await Product.find({
      category: productData.category._id,
      _id: { $ne: productData._id },
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category");

    // Apply the same offer logic to related products
    RelatedProducts = RelatedProducts.map((relatedProduct) => {
      const relatedCategoryOffer = relatedProduct.category?.offer || null;
      const relatedProductOffer = relatedProduct.offer || null;

      let relatedBestOffer = null;
      if (
        relatedCategoryOffer?.discountPercentage &&
        relatedProductOffer?.discountPercentage
      ) {
        relatedBestOffer =
          relatedCategoryOffer.discountPercentage >
          relatedProductOffer.discountPercentage
            ? relatedCategoryOffer
            : relatedProductOffer;
      } else {
        relatedBestOffer = relatedCategoryOffer || relatedProductOffer;
      }

      let relatedFinalPrice = relatedProduct.salePrice;
      if (relatedBestOffer) {
        relatedFinalPrice =
          relatedProduct.salePrice -
          (relatedProduct.salePrice * relatedBestOffer.discountPercentage) /
            100;
      }

      return {
        ...relatedProduct._doc, // Spread original product data
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
      finalPrice, // Display the final price after applying the best offer
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  productDetails,
};
