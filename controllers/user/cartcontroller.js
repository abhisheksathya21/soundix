const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });

   
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        populate: {
          path: "category",
          model: "Category", 
        },
      });

    if (!cart) {
      return res.render("cart", {
        cart: { items: [], totalAmount: 0 },
        user: userData,
      });
    }

    
    const validItems = cart.items.filter(
      (item) => !item.product.isBlocked && item.product.category.isListed
    );
    cart.items = validItems;

    
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    
    cart.totalAmount = Math.round(totalAmount);

    
    if (validItems.length !== cart.items.length) {
      await cart.save();
    }

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

    const product = await Product.findById(productId).populate("category");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.isBlocked) {
      return res
        .status(400)
        .json({ error: "This product is currently unavailable." });
    }

    if (product.category && !product.category.isListed) {
      return res
        .status(400)
        .json({ error: "This product's category is currently unavailable." });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({
        error: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
      });
    }

    const categoryOffer = product.category?.offer || null;
    const productOffer = product.offer || null;
    let bestOffer = null;

    if (categoryOffer?.discountPercentage && productOffer?.discountPercentage) {
      bestOffer =
        categoryOffer.discountPercentage > productOffer.discountPercentage
          ? categoryOffer
          : productOffer;
    } else {
      bestOffer = categoryOffer || productOffer;
    }

    let finalPrice = product.salePrice;
    if (bestOffer) {
      finalPrice =
        product.salePrice -
        (product.salePrice * bestOffer.discountPercentage) / 100;
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );
    const MAX_LIMIT = 5;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

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
      existingItem.price = finalPrice;
    } else {
      if (quantity > MAX_LIMIT) {
        return res.status(400).json({
          error: `Cannot add more than ${MAX_LIMIT} units of this product to the cart.`,
        });
      }

      cart.items.push({
        product: productId,
        quantity,
        price: finalPrice,
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

    const wishlist = await Wishlist.findOne({ user: userId });
    if (
      !wishlist ||
      !wishlist.items.some((item) => item.product.toString() === productId)
    ) {
      return res.status(404).json({ error: "Product not found in wishlist" });
    }

    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (product.isBlocked) {
      return res.status(400).json({ error: "Product is blocked" });
    }
    if(product.category && !product.category.isListed){
      return res.status(404).json({error:"This product's category is currently unavailable."});
    }

    if (quantity > product.quantity) {
      return res.status(400).json({
        error: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
      });
    }

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

    let finalPrice = product.salePrice;
    if (bestOffer) {
      finalPrice =
        product.salePrice -
        (product.salePrice * bestOffer.discountPercentage) / 100;
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

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
      existingItem.price = finalPrice; 
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: finalPrice,
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
    const product = await Product.findById(productId);
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

    item.quantity = quantity;

    let totalAmount = 0;
    for (let i = 0; i < cart.items.length; i++) {
      totalAmount = totalAmount + cart.items[i].price * cart.items[i].quantity;
    }
    cart.totalAmount = Math.round(totalAmount);

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
const validateCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: { path: "category" },
    });

    if (!cart || !cart.items.length) {
      return res.json({ valid: true, warnings: [] });
    }

    const warnings = [];
    cart.items.forEach((item) => {
      if (!item.product) {
        warnings.push({
          productId: item.product,
          message: "Product not found",
        });
      } else if (item.product.isBlocked) {
        warnings.push({
          productId: item.product._id,
          message: "Product is unavailable",
        });
      } else if (item.product.category && !item.product.category.isListed) {
        warnings.push({
          productId: item.product._id,
          message: "Category is unavailable",
        });
      } else if (item.quantity > item.product.quantity) {
        warnings.push({
          productId: item.product._id,
          message: `Only ${item.product.quantity} left in stock`,
        });
      }
    });

    res.json({ valid: warnings.length === 0, warnings });
  } catch (error) {
    console.error("Cart validation error:", error);
    res.status(500).json({ error: "Failed to validate cart" });
  }
};

module.exports = {
  loadCart,
  addtoCart,
  addToCartFromWishlist,
  removeCart,
  updateQuantity,
  validateCart,
};
