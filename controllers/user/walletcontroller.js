const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Razorpay = require("razorpay"); 
const crypto = require("crypto"); 


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const wallet = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData=await User.findOne({_id:userId});
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await new Wallet({ userId }).save();
    }

    const formattedTransactions = wallet.transactions.map((transaction) => ({
      type: transaction.type,
      amount: transaction.amount,
      description:
        transaction.description || getDefaultDescription(transaction.type),
      date: new Date(transaction.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: transaction.status,
      isDebit: ["Purchase", "Withdrawal"].includes(transaction.type),
    }));

    const sortedTransactions = formattedTransactions.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    
   

    res.render("wallet", {
      walletBalance: wallet.balance.toFixed(2),
      transactions: sortedTransactions,
      user:userData
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).render("wallet", {
      walletBalance: "0.00",
      transactions: [],
      error: "Error fetching wallet details",
    });
  }
};

function getDefaultDescription(type) {
  switch (type) {
    case "Deposit":
      return "Money added to wallet";
    case "Purchase":
      return "Purchase payment";
    case "Refund":
      return "Order refund";
    case "Withdrawal":
      return "Money withdrawn";
    case "Referal":
      return "Referral bonus";
    default:
      return "Wallet transaction";
  }
}
const getWalletBalance = async (req, res) => {
  try {
    const userId = req.session.user;
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await new Wallet({ userId }).save();
    }

    res.status(200).json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    res.status(500).json({ success: false, error: "Failed to fetch wallet balance" });
  }
};
const addMoney = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `wallet_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: Math.round(amount * 100),
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error adding money:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
};

const verifyRecharge = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const userId = req.session.user;
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await new Wallet({ userId }).save();
    }
    

    await wallet.addTransaction({
      type: "Deposit",
      amount: amount,
      description: "Wallet recharge",
      status: "Completed",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error verifying recharge:", error);
    res.status(500).json({ error: "Verification failed" });
  }
};

module.exports = {
  addMoney,
  verifyRecharge,
  wallet,
  getWalletBalance,
};
