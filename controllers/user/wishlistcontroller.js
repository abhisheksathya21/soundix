const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wishlist = require("../../models/wishlistSchema");

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user;

    const userData = await User.findOne({ _id: userId });
    if (!userId || !userData) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: "items.product",
      populate: { path: "category" },
    });

    if (!wishlist || wishlist.items.length === 0) {
      return res.render("wishlist", {
        user: userData,
        wishlist: null,
        isGoogleUser: !!userData.googleId,
        message: "Your wishlist is empty",
      });
    }

    wishlist.items = wishlist.items.filter((item) => {
      const product = item.product;
      if (!product || product.isBlocked === true) {
        return false;
      }
      if (product.category && product.category.isListed === false) {
        return false;
      }
      return true;
    });

    if (wishlist.items.length === 0) {
      return res.render("wishlist", {
        user: userData,
        wishlist: null,
        isGoogleUser: !!userData.googleId,
        message: "Your wishlist is empty or contains only unavailable items",
      });
    }

    res.render("wishlist", {
      user: userData,
      wishlist: wishlist,
      isGoogleUser: !!userData.googleId,
    });
  } catch (error) {
    console.error("Wishlist page error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.isBlocked === true) {
      return res.status(400).json({
        success: false,
        message: "This product is currently unavailable",
      });
    }

    if (product.category && product.category.isListed === false) {
      return res.status(400).json({
        success: false,
        message: "This product's category is currently unavailable",
      });
    }

    if (product.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "This product is out of stock",
      });
    }

    let finalPrice = product.salePrice || product.regularPrice;
    const categoryOffer =
      product.category?.offer &&
      typeof product.category.offer.discountPercentage === "number"
        ? product.category.offer
        : { discountPercentage: 0 };
    const productOffer =
      product.offer && typeof product.offer.discountPercentage === "number"
        ? product.offer
        : { discountPercentage: 0 };

    let bestOffer = null;
    if (
      categoryOffer.discountPercentage > 0 &&
      productOffer.discountPercentage > 0
    ) {
      bestOffer =
        categoryOffer.discountPercentage > productOffer.discountPercentage
          ? categoryOffer
          : productOffer;
    } else {
      bestOffer =
        categoryOffer.discountPercentage > 0
          ? categoryOffer
          : productOffer.discountPercentage > 0
          ? productOffer
          : null;
    }

    if (bestOffer) {
      finalPrice =
        finalPrice - (finalPrice * bestOffer.discountPercentage) / 100;
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        items: [],
      });
    }

    const existingItem = wishlist.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      // Remove item
      wishlist.items = wishlist.items.filter(
        (item) => item.product.toString() !== productId
      );
      await wishlist.save();
      return res.json({
        success: true,
        message: "Product removed from wishlist",
        isAdded: false,
        wishlist: wishlist.items,
      });
    } else {
      wishlist.items.push({
        product: productId,
        finalPrice,
        addedOn: new Date(),
      });
      await wishlist.save();
      return res.json({
        success: true,
        message: "Product added to wishlist",
        isAdded: true,
        wishlist: wishlist.items,
      });
    }
  } catch (error) {
    console.error("Toggle wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update wishlist",
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId } } },
      { new: true }
    );

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    res.json({
      success: true,
      message: "Product removed from wishlist",
      remainingItems: wishlist.items.length,
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove from wishlist",
    });
  }
};
const getWishlistState = async (req, res) => {
  try {
    const userId = req.session.user;
    const wishlist = await Wishlist.findOne({ user: userId });

    const wishlistItems = wishlist
      ? wishlist.items.map((item) => item.product.toString())
      : [];

    res.json({
      success: true,
      wishlistItems,
    });
  } catch (error) {
    console.error("Get wishlist state error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get wishlist state",
    });
  }
};



 const wishlistcount=async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: true, count: 0 });
  }
  try {
    const wishlist = await Wishlist.findOne({ user: req.session.user }).populate('items.product');
    const count = wishlist ? wishlist.items.filter(item => !item.product.isBlocked).length : 0;
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching wishlist count:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
module.exports = {
  loadWishlist,
  toggleWishlist,
  removeFromWishlist,
  getWishlistState,
  wishlistcount,
};
