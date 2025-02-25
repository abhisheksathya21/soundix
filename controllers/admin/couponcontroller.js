const Coupon=require('../../models/couponSchema');

const loadCoupon=async(req,res)=>{
   try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);

    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render('coupon', {
      coupons,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      startDate,
      expiryDate,
      usageLimit,
      perUserLimit
    } = req.body;

    
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const newCoupon = new Coupon({
      code,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      startDate: new Date(startDate),
      expiryDate: new Date(expiryDate),
      usageLimit,
      perUserLimit,
      isActive: true
    });

    await newCoupon.save();
    res.status(201).json(newCoupon);
  } catch (error) {
    res.status(500).json({ message: 'Error creating coupon', error: error.message });
  }
};
const getEditCouponPage = async (req, res) => {
  try {
    const { id } = req.query;
  
    
    if (!id) {
      return res.status(400).json({ message: 'Invalid coupon ID' });
    }

    const coupon = await Coupon.findById(id);
 
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.render('editCoupon', { coupon });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coupon', error: error.message });
  }
};
const updateCoupon = async (req, res) => {
    
  try {
    
    const { id } = req.query;
    const updateData = req.body;
    console.log("updateData", updateData);

    if (!id) {
      return res.status(400).json({ message: 'Invalid coupon ID' });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    console.log("updatedCoupon3434", updatedCoupon);
    if (!updatedCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json(updatedCoupon);
  } catch (error) {
    res.status(500).json({ message: 'Error updating coupon', error: error.message });
  }
};

const toggleCouponStatus = async (req, res) => {
    
  try {
    const { couponId } = req.body;
   
    if (!couponId) {
      return res.status(400).json({ message: 'Invalid coupon ID' });
    }

    const coupon = await Coupon.findById(couponId);
   
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({ 
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`, 
      coupon 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling coupon status', error: error.message });
  }
};



module.exports={
    loadCoupon,
    createCoupon,
    getEditCouponPage,
    updateCoupon,
    toggleCouponStatus,
}