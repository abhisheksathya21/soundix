const express=require('express');
const router=express.Router();
const admincontroller=require('../controllers/admin/admincontroller');
const customercontroller=require('../controllers/admin/customercontroller');
const categorycontroller=require('../controllers/admin/categorycontroller')
const {UserAuth,AdminAuth}=require('../middlewares/auth')


router.get('/pageError',admincontroller.pageError);
//Login Management

router.get('/login',admincontroller.loadlogin);
router.post('/login',admincontroller.login);
router.get('/',AdminAuth,admincontroller.loaddashboard);
router.get('/logout',admincontroller.logout);


//Customer Management

router.get('/customers',AdminAuth,customercontroller.customerInfo);
router.get('/blockCustomer',AdminAuth,customercontroller.blockCustomer);
router.get('/UnblockCustomer',AdminAuth,customercontroller.UnblockCustomer);

//Category Management

router.get('/category',AdminAuth,categorycontroller.categoryInfo);

module.exports=router;