const User = require("../models/userSchema");
const Cart = require("../models/cartSchema");

const cartCountMiddleware = async (req, res, next) => {
  
  if (req.session.user) {
    try {
      const cart = await Cart.findOne({ user: req.session.user }).populate(
        "items.product"
      );
      res.locals.cartItemCount = cart
        ? cart.items.filter((item) => !item.product.isBlocked).length
        : 0;
       
    } catch (error) {
      console.error("Cart count error:", error);
      res.locals.cartItemCount = 0;
    }
  } else {
    res.locals.cartItemCount = 0;
  }
  next();
};

module.exports = cartCountMiddleware;
