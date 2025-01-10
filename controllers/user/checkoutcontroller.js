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

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(400).json({ error: "User is not logged in" });
    }

    const cartData = await Cart.findOne({ user: userId }).populate(
      "items.product"
    );
    if (!cartData || cartData.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const { addressId } = req.body;
    if (!addressId) {
      return res.status(400).json({ error: "Invalid or missing address ID" });
    }

    const addressDocument = await Address.findOne({ userId });
    if (!addressDocument) {
      return res.status(400).json({ error: "No addresses found for the user" });
    }

    const addressData = addressDocument.address.find(
      (addr) => addr._id.toString() === addressId
    );
    if (!addressData) {
      return res.status(400).json({ error: "Shipping address not found" });
    }

    const shippingAddress = {
      name: addressData.name,
      addressType: addressData.addressType,
      street: addressData.landmark || "",
      city: addressData.city,
      state: addressData.state,
      country: "India",
      pinCode: addressData.pincode,
      phoneNumber: addressData.phone,
    };

    const subTotal = cartData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const taxAmount = 0;
    const totalAmount = subTotal;

    const orderItems = cartData.items.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
      price: item.price,
    }));

    for (const cartItem of cartData.items) {
      const product = cartItem.product;
      const newStock = product.quantity - cartItem.quantity;

      if (newStock < 0) {
        return res.status(400).json({
          error: `Insufficient stock for product: ${product.name}`,
        });
      }

      await Product.updateOne(
        { _id: product._id },
        { $set: { quantity: newStock } }
      );
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOrder = new Order({
      orderId,
      userId,
      items: orderItems,
      shippingAddress,
      subTotal,
      taxAmount,
      totalAmount,
      paymentMethod: "COD",
    });

    await newOrder.save();
    await Cart.updateOne({ user: userId }, { $set: { items: [] } });

    res.status(200).json({
      message: "Order placed successfully",
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};


const orderSuccess=async(req,res)=>{
  try{
    const userId=req.session.user;
    if(!userId){
      return res.redirect('/login');
    }
    const OrderData=await Order.find({userId:userId});
    console.log("orderdata", OrderData);
    res.render('order-success',{orderData:OrderData});
  }catch(error){
    console.error("Error loading order success page:",error);
    res.redirect('/pageNotFound');
  }
}


module.exports = {
  loadCheckout,
  placeOrder,
  orderSuccess,
};
