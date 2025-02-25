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
        isGoogleUser: !!userData.googleId, 
      });
    }
  } catch (error) {
    console.error("Error in passing the user data to user profile", error);
  }
};

const userUpdate = async (req, res) => {
  try {
    const userId = req.session.user;
    const { name, phone } = req.body;
    const userData = await User.findOne({ _id: userId });

    const updateFields = { fullname: name };
    if (!userData.googleId && phone) {
      updateFields.phone = phone;
    }

    await User.updateOne({ _id: userId }, { $set: updateFields });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in updating the user profile", error);
    res.status(500).json({ success: false, message: "An error occurred while updating the profile." });
  }
};

const password = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    if (userId) {
      return res.render("password", {
        user: userData,
        isGoogleUser: !!userData.googleId,
      });
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
        isGoogleUser: !!userData.googleId, 
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
        .json({ message: "Address added successfully", address: userAddress,  isGoogleUser: !!userData.googleId, });
    }
  } catch (error) {
    console.error("Error adding address", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const editAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const currentAddress = await Address.findOne({ "address._id": addressId });

    if (!currentAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    const addressData = currentAddress.address.find((addr) => addr._id.toString() === addressId);

    if (!addressData) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.render("editAddress", { address: addressData, user: user, isGoogleUser: !!userData.googleId });
  } catch (error) {
    console.error("Error in loading editAddress page", error); 
    res.redirect('/pageNotFound');
  }
};


const updateAddress = async (req, res) => {
  try {
    const data = req.body;
    const addressId = req.query.id;
    const userId = req.session.user;

    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    const result = await Address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          "address.$": {
            addressType: data.addressType,
            name: data.name,
            city: data.city,
            landmark: data.landmark || "", 
            district: data.district,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
            alternativePhone: data.alternativePhone || "", 
            _id: addressId,
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Address not found or not updated" });
    }

    
    res.status(200).json({ success: true, message: "Address updated successfully" });
  } catch (error) {
    console.error("Error in updating address", error);
    res.status(500).json({ success: false, message: "Server error while updating address" });
  }
};





const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.user;

    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    await Address.updateOne(
      { "address._id": addressId },
      { $pull: { address: { _id: addressId } } }
    );

   
    res.status(200).json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error in deleting address", error);
    res.status(500).json({ success: false, message: "Server error while deleting address" });
  }
};





const orders = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect("/login");
    }

   
    const page = parseInt(req.query.page) || 1;
    const limit = 2; // Orders per page
    const skip = (page - 1) * limit;

    const userData = await User.findOne({ _id: userId });

   
    const totalOrders = await Order.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalOrders / limit);

    
    const orderData = await Order.find({ userId: userId })
      .populate("items.productId")
      .sort({ orderDate: -1 }) 
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
        productId: item.productId?._id, // Add this line
        name: item.productId?.productName || "Unknown Product",
        price: item.price || 0,
        quantity: item.quantity || 0,
        image: item.productId?.productImage?.[0],
        status: item.status || "Pending",
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
      isGoogleUser: !!userData.googleId,
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
  editAddress,
  updateAddress,
  deleteAddress,
  orders,
  
};
