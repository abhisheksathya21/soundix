const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();

const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const addressData = await Address.findOne({ userId: userId });
   
    if (userId) {
      return res.render("userProfile", {
        user: userData,
        userAddress: addressData,
      });
    }
  } catch (error) {
    console.error("Error in passing the user data to user profile", error);
  }
};

const userUpdate = async (req, res) => {
  try {
    const userId = req.session.user;
    const { name, email, phone } = req.body;

    await User.updateOne(
      { _id: userId },
      { $set: { fullname: name, phone: phone } }
    );
    const updateUser = await User.findById(userId);

    if (updateUser) {
      return res.render("userProfile", { user: updateUser });
    }
  } catch (error) {
    console.error("Error in updating the user profile", error);
    res.status(500).send("An error occurred while updating the profile.");
  }
};

const password = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    if (userId) {
      return res.render("password", { user: userData });
    }
  } catch (error) {
    console.error("Error in loading password page", error);
  }
};

const UpdatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      userData.password
    );
    if (!passwordMatch) {
      return res.status(400).json({ message: "Password doesn't match" });
    }

    const hashedpassword = await bcrypt.hash(newPassword, 10);
    userData.password = hashedpassword;
    await userData.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addressManagement = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const addressData = await Address.findOne({ userId: userId });
  
    if (userId) {
      return res.render("addressManagement", {
        user: userData,
        userAddress: addressData,
      });
    }
  } catch (error) {
    console.error("Error in loading addressManagement page", error);
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const {
      addressType,
      name,
      city,
      landmark,
      district,
      state,
      pincode,
      phone,
      alternativePhone,
    } = req.body;

    if (
      !addressType ||
      !name ||
      !city ||
      !district ||
      !state ||
      !pincode ||
      !phone
    ) {
      return res
        .status(400)
        .json({ message: "Missing required address fields" });
    }

    const userAddress = await Address.findOne({ userId: userData._id });

    if (!userAddress) {
      const newAddress = new Address({
        userId: userData._id,
        address: [
          {
            addressType,
            name,
            city,
            landmark,
            district,
            state,
            pincode,
            phone,
            alternativePhone,
          },
        ],
      });
      await newAddress.save();
      return res
        .status(201)
        .json({ message: "Address added successfully", address: newAddress });
    } else {
      userAddress.address.push({
        addressType,
        name,
        city,
        landmark,
        district,
        state,
        pincode,
        phone,
        alternativePhone,
      });

      await userAddress.save();
      return res
        .status(200)
        .json({ message: "Address added successfully", address: userAddress });
    }
  } catch (error) {
    console.error("Error adding address", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getEditAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
   
    const userId = req.session.user;
    

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const addressData = await Address.findOne({
      userId: userId,
      "address._id": addressId,
    });
    if (!addressData) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized access",
      });
    }
   

    res.render("editAddress", { address: addressData, user });
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.user;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const addressIndex = user.address.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    user.address.splice(addressIndex, 1);
    await user.save();

    res.redirect("/addressManagement");
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, message: "Error deleting address" });
  }
};

const orders = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect("/login");
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 3; // Orders per page
    const skip = (page - 1) * limit;

    const userData = await User.findOne({ _id: userId });

    // Get total count of orders for pagination
    const totalOrders = await Order.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalOrders / limit);

    // Get paginated orders
    const orderData = await Order.find({ userId: userId })
      .populate("items.productId")
      .sort({ orderDate: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    const formattedOrders = orderData.map((order) => ({
      id: order.orderId,
      date: new Date(order.orderDate).toLocaleDateString(),
      status: order.orderStatus,
      total: order.totalAmount,
      paymentMethod: order.paymentMethod,
      shippingMethod: "Standard Shipping",
      products: order.items.map((item) => ({
        name: item.productId?.productName || "Unknown Product",
        price: item.price || 0,
        quantity: item.quantity || 0,
        image: item.productId?.productImage?.[0],
      })),
      shippingAddress: {
        name: order.shippingAddress.name,
        address: `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.pinCode}`,
        phone: order.shippingAddress.phoneNumber,
      },
    }));

    res.render("order-details", {
      orders: formattedOrders,
      user: userData,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
    });
  } catch (error) {
    console.error("Error in loading orders page:", error);
    res.status(500).render("error", { message: "Failed to load orders" });
  }
};

module.exports = {
  userProfile,
  userUpdate,
  password,
  UpdatePassword,
  addressManagement,
  addAddress,
  getEditAddress,
  deleteAddress,
  orders,
};
