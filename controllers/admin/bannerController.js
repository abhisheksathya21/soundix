const fs = require('fs');
const path = require('path');
const Banner = require('../../models/Banner');

const getBanners = async (req, res) => {
    try {
      const banners = await Banner.find().sort({ position: 1 }).lean();
      
     
      const success = req.session.success;
      req.session.success = null; 
  
      res.render('banners', { banners, success });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching banners.');
    }
  };
  

const getAddBanner = (req, res) => {
  res.render('bannerForm', { banner: null });
};

const addBanner = async (req, res) => {
  try {
    const { title, link, startDate, endDate, position } = req.body;
    
    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      req.session.error = 'End date must be after the start date.';
      return res.redirect('/admin/banners/add');
    }

    const imageUrl = req.file ? `/uploads/banners/${req.file.filename}` : null;
    if (!imageUrl) {
      req.session.error = 'Image is required.';
      return res.redirect('/admin/banners/add');
    }

    const banner = new Banner({
      title,
      imageUrl,
      link,
      startDate,
      endDate,
      position: position || 0,
    });

    await banner.save();
    req.session.success = 'Banner added successfully!';
    res.redirect('/admin/banners');
  } catch (err) {
    console.error(err);
    req.session.error = 'Failed to add banner.';
    res.redirect('/admin/banners');
  }
};

const getEditBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id).lean();
    if (!banner) return res.status(404).send('Banner not found.');
    res.render('bannerForm', { banner });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading banner edit page.');
  }
};

const editBanner = async (req, res) => {
  try {
    const { title, link, startDate, endDate, position } = req.body;
    
    if (new Date(startDate) >= new Date(endDate)) {
      req.session.error = 'End date must be after the start date.';
      return res.redirect(`/admin/banners/edit/${req.params.id}`);
    }

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).send('Banner not found.');

    if (req.file) {
      // Delete old image
      const oldImagePath = path.join(__dirname, '../../public', banner.imageUrl);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      banner.imageUrl = `/uploads/banners/${req.file.filename}`;
    }

    banner.title = title;
    banner.link = link;
    banner.startDate = startDate;
    banner.endDate = endDate;
    banner.position = position || 0;

    await banner.save();
    req.session.success = 'Banner updated successfully!';
    res.redirect('/admin/banners');
  } catch (err) {
    console.error(err);
    req.session.error = 'Failed to update banner.';
    res.redirect('/admin/banners');
  }
};

const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).send('Banner not found.');

    // Delete banner image from storage
    const imagePath = path.join(__dirname, '../../public', banner.imageUrl);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await banner.deleteOne();
    req.session.success = 'Banner deleted successfully!';
    res.redirect('/admin/banners');
  } catch (err) {
    console.error(err);
    req.session.error = 'Failed to delete banner.';
    res.redirect('/admin/banners');
  }
};

const toggleBannerStatus = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).send('Banner not found.');

    banner.status = !banner.status;
    await banner.save();

    req.session.success = `Banner ${banner.status ? 'activated' : 'deactivated'} successfully!`;
    res.redirect('/admin/banners');
  } catch (err) {
    console.error(err);
    req.session.error = 'Failed to update banner status.';
    res.redirect('/admin/banners');
  }
};

module.exports = {
  getBanners,
  getAddBanner,
  addBanner,
  getEditBanner,
  editBanner,
  deleteBanner,
  toggleBannerStatus
};
