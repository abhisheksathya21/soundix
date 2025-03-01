const express=require('express');
const router=express.Router();
const multer = require('multer');
const admincontroller=require('../controllers/admin/admincontroller');
const customercontroller=require('../controllers/admin/customercontroller');
const categorycontroller=require('../controllers/admin/categorycontroller');
const productcontroller=require('../controllers/admin/productcontroller');
const ordercontroller=require('../controllers/admin/ordercontroller');
const couponcontroller=require('../controllers/admin/couponcontroller');
const salesReportcontroller =require('../controllers/admin/salesReportcontroller');
const {UserAuth,AdminAuth}=require('../middlewares/auth');
const dashboardController = require("../controllers/admin/dashboardController");

router.get("/dashboard", (req, res) => {
  res.render("dashboard");
});
router.get("/dashboard/data", dashboardController.getDashboardData);

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



router.get("/sales-report", AdminAuth, salesReportcontroller.getSalesReport);
router.get(
  "/sales-report/data",
  AdminAuth,
  salesReportcontroller.getSalesReportData
);
router.get(
  "/sales-report/export/pdf",
  AdminAuth,
  salesReportcontroller.exportSalesReportPDF
);
router.get(
  "/sales-report/export/excel",
  AdminAuth,
  salesReportcontroller.exportSalesReportExcel
);


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
router.post("/addCategoryOffer",AdminAuth,categorycontroller.addCategoryOffer);
router.post("/removeCategoryOffer",AdminAuth,categorycontroller.removeCategoryOffer);


//product Management
router.get('/addproducts',AdminAuth,productcontroller.loadProductaddpage);
router.post('/addproducts', AdminAuth, uploads.array("images", 6), productcontroller.addProducts);

router.get('/products',AdminAuth,productcontroller.getAllproducts);
router.get('/blockProduct',AdminAuth,productcontroller.blockProduct);
router.get('/UnblockProduct',AdminAuth,productcontroller.UnblockProduct);
router.get('/editProduct',AdminAuth,productcontroller.geteditProduct);
router.post('/editProduct/:id',AdminAuth,uploads.array("images", 6), productcontroller.editProduct);
router.post("/addProductOffer", AdminAuth, productcontroller.addProductOffer);
router.post("/removeProductOffer",AdminAuth,productcontroller.removeProductOffer);

//coupon management
router.get("/coupon",AdminAuth,couponcontroller.loadCoupon);
router.post("/addCoupon", couponcontroller.createCoupon);
router.get("/editCoupon", couponcontroller.getEditCouponPage);
router.post("/editCoupon", couponcontroller.updateCoupon);
router.post("/toggleCouponStatus", couponcontroller.toggleCouponStatus);

//order lists
router.get("/orders",AdminAuth, ordercontroller.getAllOrders)



//order status
router.post("/update-order-status",AdminAuth,ordercontroller.updateOrderStatus);
router.post("/cancel-order",AdminAuth,ordercontroller.cancelProductOrder);
//

router.get("/return-requests", AdminAuth,ordercontroller.getReturnRequests);
router.post("/process-return-request",AdminAuth,ordercontroller.processReturnRequest);





module.exports=router;