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
    const wishlist = await Wishlist.findOne({ user: userId }).populate(
      "items.product"
    );
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

    // First, verify both userId and productId exist
    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Missing required information",
      });
    }

    // Find existing wishlist or create new one
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        items: [],
      });
    }

    // Check if item exists in wishlist
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
      });
    } else {
      // Add item
      wishlist.items.push({
        product: productId,
        addedOn: new Date(),
      });
      await wishlist.save();

      return res.json({
        success: true,
        message: "Product added to wishlist",
        isAdded: true,
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

    // Use findOneAndUpdate instead of find and save
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


module.exports = {
  loadWishlist,
  toggleWishlist,
  removeFromWishlist,
  getWishlistState,
};