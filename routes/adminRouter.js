const express=require('express');
const router=express.Router();
const multer = require('multer');
const admincontroller=require('../controllers/admin/admincontroller');
const customercontroller=require('../controllers/admin/customercontroller');
const categorycontroller=require('../controllers/admin/categorycontroller');
const productcontroller=require('../controllers/admin/productcontroller');
const {UserAuth,AdminAuth}=require('../middlewares/auth');


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/productimages'); // Set the destination for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Set the filename
    }
});

const uploads = multer({ storage: storage });

router.get('/pageError',admincontroller.pageError);
//Login Management

router.get('/login',admincontroller.loadLogin);
router.post('/login',admincontroller.login);
router.get('/',AdminAuth,admincontroller.loadDashboard);
router.get('/logout',admincontroller.logout);


//Customer Management

router.get('/customers',AdminAuth,customercontroller.customerInfo);
router.get('/blockCustomer',AdminAuth,customercontroller.blockCustomer);
router.get('/UnblockCustomer',AdminAuth,customercontroller.UnblockCustomer);

//Category Management

router.get('/category',AdminAuth,categorycontroller.categoryInfo);
router.post('/addCategory',AdminAuth,categorycontroller.addcategory);
router.get('/editcategory',AdminAuth,categorycontroller.geteditcategory);
router.post('/editcategory/:id',AdminAuth,categorycontroller.editcategory);
router.get('/listcategory',AdminAuth,categorycontroller.listcategory);
router.get('/Unlistcategory',AdminAuth,categorycontroller.Unlistcategory);

//product Management
router.get('/addproducts',AdminAuth,productcontroller.loadProductaddpage);
router.post('/addproducts',AdminAuth,uploads.array("images",4),productcontroller.addProducts);

module.exports=router;