const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();

const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const addressData = await Address.findOne({ userId: userId });
    console.log(addressData);
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
    console.log(addressData);
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

const editAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressId = req.query.id;
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
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
};
