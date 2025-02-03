const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      return res.render("cart", {
        cart: { items: [], totalAmount: 0 },
        user: userData,
      });
    }

    excludeBlockdProducts=cart.items.filter((items)=>!items.product.isBlocked);
    cart.items=excludeBlockdProducts;
    let totalAmount = 0;
    for (let i = 0; i < cart.items.length; i++) {
      totalAmount += cart.items[i].price * cart.items[i].quantity;
    }
    console.log("totalAmount", totalAmount);
    cart.totalAmount = totalAmount;
    await cart.save();
    
    res.render("cart", {
      cart: cart,
      user: userData,
    });
  } catch (error) {
    console.error("Cart page error:", error);
    res.status(500).render("error", { error: "Failed to load cart" });
  }
};




const addtoCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.session.user;

    // Fetch product details
    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (product.isBlocked) {
      return res.status(400).json({ error: "Product is blocked" });
    }
    if (quantity > product.quantity) {
      return res.status(400).json({
        error: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
      });
    }

    // Determine the best offer
    const categoryOffer = product.category?.offer || null;
    const productOffer = product.offer || null;
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

    // Calculate discounted price
    let finalPrice = product.salePrice;
    if (bestOffer) {
      finalPrice =
        product.salePrice -
        (product.salePrice * bestOffer.discountPercentage) / 100;
    }

    // Find user's cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const MAX_LIMIT = 5;

      if (newQuantity > MAX_LIMIT) {
        return res.status(400).json({
          error: `Cannot add more than ${MAX_LIMIT} units of this product to the cart.`,
        });
      }
      if (newQuantity > product.quantity) {
        return res.status(400).json({
          error: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
        });
      }

      existingItem.quantity = newQuantity;
      existingItem.price = finalPrice; // Update price with discount
      console.log("existingItem", existingItem);
    } else {
      if (quantity > 5) {
        return res.status(400).json({
          error: `Cannot add more than 5 units of this product to the cart.`,
        });
      }

      cart.items.push({
        product: productId,
        quantity,
        price: finalPrice, // Store original price for reference
         // Store the discounted price
      });
    }

    await cart.save();
    await cart.populate("items.product");

    res.json(cart);
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;
    const quantity = 1;

    // Check if the product is in the wishlist
    const wishlist = await Wishlist.findOne({ user: userId });
    if (
      !wishlist ||
      !wishlist.items.some((item) => item.product.toString() === productId)
    ) {
      return res.status(404).json({ error: "Product not found in wishlist" });
    }

    // Fetch product details
    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (product.isBlocked) {
      return res.status(400).json({ error: "Product is blocked" });
    }

    // Check if the requested quantity is available
    if (quantity > product.quantity) {
      return res.status(400).json({
        error: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
      });
    }

    // Determine the best offer
    const categoryOffer = product.category?.offer || null;
    const productOffer = product.offer || null;
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

    // Calculate the final discounted price
    let finalPrice = product.salePrice;
    if (bestOffer) {
      finalPrice =
        product.salePrice -
        (product.salePrice * bestOffer.discountPercentage) / 100;
    }

    // Find user's cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    // Check if product already exists in cart
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const MAX_LIMIT = 5;

      if (newQuantity > MAX_LIMIT) {
        return res.status(400).json({
          error: `Cannot add more than ${MAX_LIMIT} units of this product to the cart.`,
        });
      }
      if (newQuantity > product.quantity) {
        return res.status(400).json({
          error: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
        });
      }

      existingItem.quantity = newQuantity;
      existingItem.price = finalPrice; // Update price with discount
     
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: finalPrice, // Store original price for reference
        
      });
    }

    
    await cart.save();
    await Wishlist.updateOne(
      { user: userId },
      { $pull: { items: { product: productId } } }
    );
    await cart.populate("items.product");

    res.json({
      success: true,
      message: "Product successfully moved from wishlist to cart",
      cart,
    });
  } catch (error) {
    console.error("Add to cart from wishlist error:", error);
    res.status(500).json({ error: "Failed to add item to cart from wishlist" });
  }
};


const removeCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.body.productId;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "cart not found" });
    }
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    //  total amount
    let totalAmount = 0;
    for (let i = 0; i < cart.items.length; i++) {
      totalAmount += cart.items[i].price * cart.items[i].quantity;
    }
    cart.totalAmount = totalAmount;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart,
    });
  } catch (error) {
    console.error("Error removing product from cart:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to remove product" });
  }
};
const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, quantity } = req.body;
    
    if (quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be at least 1" });
    }
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res
        .status(400)
        .json({ success: false, message: "Cart not found" });
    }
    const product=await Product.findById(productId);
    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }
    if (quantity > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity exceeds limit" });
    }
    if (quantity > product.quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity exceeds stock" });
    }
    //update quantity
    item.quantity = quantity;
    
    let totalAmount = 0;
    for (let i = 0; i < cart.items.length; i++) {
      totalAmount = totalAmount + cart.items[i].price * cart.items[i].quantity;
    }
    cart.totalAmount = totalAmount;

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Quantity updated successfully",
      cart,
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update quantity" });
  }
};

module.exports = {
  loadCart,
  addtoCart,
  addToCartFromWishlist,
  removeCart,
  updateQuantity,
};
