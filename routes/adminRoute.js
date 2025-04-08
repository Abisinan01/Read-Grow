import express from 'express';
const router = express.Router()
import adminAuth from "../middlewares/adminAuth.js"
import {
    addCategory,
    addCategoryGet,
    addProducts,
    addProductsPost,

    adminLoginGet,
    adminLoginPost,
    adminLogout,
    blockProduct,
    blockUser,
    categoryManagment,
    deleteCategory,
    deleteProduct,
    editCategory,
    editCategoryPatch,
    editProduct,
    editProductsGet,
    renderProductPage,
    renderUserPanel,
    searchCategory,

} from "../controllers/admin/adminController.js"
import upload from '../utils/multer.js';
import { acceptReturn, getOrderPage, rejectReturn, updateStatus, viewOrder } from '../controllers/admin/orderController.js';
import { addOffers, deleteOffer, editOffer, renderAddOffers, renderEditOffers, renderOffersPage, selectCategory, selectProduct } from '../controllers/admin/offersController.js';
import { addCoupon, deleteCoupon, editCoupon, renderAddCoupon, renderCouponsPage, renderEditCoupon } from '../controllers/admin/couponController.js';
import {
    adminDashboardGet,
    updateDashboard
} from '../controllers/admin/dashboardController.js';
import { transactionManagment} from '../controllers/admin/transactionController.js';
import { downloadExcelReport, downloadPDFReport, salesReport } from '../controllers/admin/salesReportController.js';


//========Login
router.get('/login', adminLoginGet)
router.post('/login', adminLoginPost)
//=========Dashboard
router.get('/dashboard', adminAuth, adminDashboardGet);
router.get('/update-dashboard', adminAuth, updateDashboard)
// router.get('/sales', adminAuth, getSalesData);
router.get('/download-pdf-report', adminAuth, downloadPDFReport);
router.get('/download-excel-report', adminAuth, downloadExcelReport);


//======users
router.get('/users', adminAuth, renderUserPanel)


router.put('/blockUser/:id', adminAuth, blockUser)

//========category 
router.get('/category', adminAuth, categoryManagment)
router.post('/category', adminAuth, categoryManagment)

router.get('/add-category', adminAuth, addCategoryGet)
router.post('/add-category', adminAuth, addCategory)

router.get('/edit-category/:id', adminAuth, editCategory)
router.patch('/category/:id', adminAuth, editCategoryPatch)
router.delete('/category/:id', adminAuth, deleteCategory)
router.get('/search-category', adminAuth, searchCategory)
//===========ProductMangment
router.get("/products", adminAuth, renderProductPage)
router.get("/add-products", adminAuth, addProducts)
router.post("/add-products", upload.array('images', 3), addProductsPost)
router.get('/product/:id', adminAuth, editProductsGet)
router.patch("/product/:id", upload.array('images', 3), editProduct)
router.delete('/product/:id', adminAuth, deleteProduct)
router.put('/block-product/:id', adminAuth, blockProduct)

router.get('/orders', adminAuth, getOrderPage)
router.get('/view-order/:orderId/:productId', adminAuth, viewOrder)
router.put('/update-orders/:orderId', adminAuth, updateStatus)

router.get('/offers', adminAuth, renderOffersPage)
router.get('/add-offers', adminAuth, renderAddOffers)
router.post('/add-offers', adminAuth, addOffers)
router.get('/select-product', adminAuth, selectProduct)
router.get('/select-category', adminAuth, selectCategory)
router.delete('/offer/:id', adminAuth, deleteOffer)

router.get('/edit-offer/:id', adminAuth, renderEditOffers)
router.patch('/edit-offer/:id', adminAuth, editOffer)

router.get("/coupons", adminAuth, renderCouponsPage)
router.get('/add-coupons', adminAuth, renderAddCoupon)
router.post('/add-coupons', adminAuth, addCoupon)
router.delete('/coupons/:id', adminAuth, deleteCoupon)
router.get('/edit-coupon/:id', adminAuth, renderEditCoupon)
router.patch('/edit-coupon/:id', adminAuth, editCoupon)

router.put('/accept-return/:productId/:orderId', adminAuth, acceptReturn)
router.put('/reject-return/:productId/:orderId', adminAuth, rejectReturn)

router.get('/transactions', adminAuth, transactionManagment)

router.get('/sales-report',adminAuth,salesReport)
router.get('/')
//======logout=============
router.post("/logout", adminLogout)
//=============for handling random routes===============
router.get('/notFound', (req, res) => {
    res.render('admin/notFound')
})
router.get('*', (req, res) => {
    res.status(404).redirect("/admin/notFound")
})

//export route
export default router