const User = require("../models/userSchema");
const Wishlist = require("../models/wishlistSchema");

const wishlistCountMiddleware = async (req, res, next) => {
  if (req.session.user) {
    try {
      const wishlist = await Wishlist.findOne({ user: req.session.user }).populate("items.product");
      res.locals.wishlistItemCount = wishlist
        ? wishlist.items.filter((item) => !item.product.isBlocked).length
        : 0;
        // console.log("res.locals.wishlistItemCount",res.locals.wishlistItemCount)
    } catch (error) {
      console.error("Wishlist count error:", error);
      res.locals.wishlistItemCount = 0;
    }
  } else {
    res.locals.wishlistItemCount = 0;
  }
  next();
};

module.exports = wishlistCountMiddleware;