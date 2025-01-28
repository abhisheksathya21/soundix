const Product=require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const User=require('../../models/userSchema');

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
      { name: "shop", url: "/shop" },
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
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/pageNotFound");
  }
};
module.exports={
    productDetails
}