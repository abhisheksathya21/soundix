const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");



const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    const cartData = await Cart.findOne({ user: userId }).populate(
      "items.product"
    );
    const AddressData = await Address.findOne({ userId: userId });
    const userData = await User.findById(userId);
    res.render("checkout", {
      user: userData,
      cart: cartData,
      Address: AddressData,
    });
  } catch (error) {
    console.error("Error loading checkout page:", error);
    res.redirect("/pageNotFound");
  }
};





module.exports = {
  loadCheckout,
};
