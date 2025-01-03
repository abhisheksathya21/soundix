const express=require('express');
const router=express.Router();
const multer = require('multer');
const admincontroller=require('../controllers/admin/admincontroller');
const customercontroller=require('../controllers/admin/customercontroller');
const categorycontroller=require('../controllers/admin/categorycontroller');
const productcontroller=require('../controllers/admin/productcontroller');
const {UserAuth,AdminAuth}=require('../middlewares/auth');


const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images');
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.').pop(); // Extract file extension
        cb(null, `${uuidv4()}.${ext}`); // Unique filename
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
router.post('/addproducts', AdminAuth, uploads.array("images", 6), productcontroller.addProducts);

router.get('/products',AdminAuth,productcontroller.getAllproducts);
router.get('/blockProduct',AdminAuth,productcontroller.blockProduct);
router.get('/UnblockProduct',AdminAuth,productcontroller.UnblockProduct);
router.get('/editProduct',AdminAuth,productcontroller.geteditProduct);
router.post('/editProduct/:id',AdminAuth,uploads.array("images", 6), productcontroller.editProduct)

module.exports=router;