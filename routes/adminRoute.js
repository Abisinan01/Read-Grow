import express from 'express';
const router = express.Router()
import adminAuth from "../middlewares/adminAuth.js"
import {
    addCategory,
    addCategoryGet,
    addProducts,
    addProductsPost,
    adminDashboardGet,
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
import { getOrderPage, getViewOrder } from '../controllers/admin/orderController.js';
 

//========Login
router.get('/login', adminLoginGet) 
router.post('/login', adminLoginPost)   
//=========Dashboard
router.get('/dashboard', adminAuth, adminDashboardGet)

//======users
router.get('/users', adminAuth, renderUserPanel)


router.put('/blockUser/:id', adminAuth, blockUser)

//========category 
router.get('/category',adminAuth, categoryManagment)
router.post('/category',adminAuth, categoryManagment) 

router.get('/add-category',adminAuth, addCategoryGet)
router.post('/add-category',adminAuth, addCategory)

router.get('/edit-category/:id',adminAuth, editCategory)
router.patch('/category/:id',adminAuth, editCategoryPatch) 
router.delete('/category/:id',adminAuth, deleteCategory) 
router.get('/search-category',adminAuth,searchCategory)
//===========ProductMangment
router.get("/products",adminAuth,renderProductPage)
router.get("/add-products",adminAuth,addProducts)
router.post("/add-products",upload.array('images',3),addProductsPost)
router.get('/product/:id',adminAuth,editProductsGet)
router.patch("/product/:id",upload.array('images',3),editProduct)
router.delete('/product/:id',adminAuth ,deleteProduct)
router.put('/block-product/:id',adminAuth,blockProduct)

router.get('/orders',adminAuth,getOrderPage)
router.get('/view-order/:orderId/:productId',adminAuth,getViewOrder)
 


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