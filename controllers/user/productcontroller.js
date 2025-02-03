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

   
    const categoryOffer = productData.category?.offer || null;
    console.log("categoryOffer", categoryOffer);

  
    const productOffer = productData.offer || null;
    console.log("productOffer", productOffer);
   let bestOffer = null;

   if (categoryOffer?.discountPercentage && productOffer?.discountPercentage) {
     bestOffer =
       categoryOffer.discountPercentage > productOffer.discountPercentage
         ? categoryOffer
         : productOffer;
   } else if (categoryOffer?.discountPercentage) {
     bestOffer = categoryOffer;
   } else if (productOffer?.discountPercentage) {
     bestOffer = productOffer;
   }
   console.log("productData",productData.salePrice);

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

    const RelatedProducts = await Product.find({
      category: productData.category._id,
      _id: { $ne: productData._id },
    })
      .skip((page - 1) * limit)
      .limit(limit);

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
      RelatedProducts,
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
