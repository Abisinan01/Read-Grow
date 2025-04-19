import express from "express"
const router = express.Router()
import userAuth from "../middlewares/userAuth.js"
import {
    addToCart,
    addToWishlist,
    deleteWishlist,
    removeFromCart,
    renderCartManagment,
    renderWishListPage,
    updateQuantity
} from "../controllers/user/shopingCartController.js"
import {
    addReview,
    rateProduct,
    renderHomePage,
    renderProductDetails,
    renderShopPage,
    sortProducts
} from "../controllers/user/shopController.js"


router.get('/', renderHomePage)
router.get('/product-details/:id', userAuth, renderProductDetails)
router.patch('/rate-product/:id',userAuth,rateProduct)
router.get("/shop", userAuth, renderShopPage)
router.get('/sort/:sort', userAuth, sortProducts)

router.get('/wishlist', userAuth, renderWishListPage)
router.post('/wishlist/add', userAuth, addToWishlist)
router.delete('/wishlist/remove/:id', userAuth, deleteWishlist)

router.get('/cart', userAuth, renderCartManagment)
router.post('/cart', userAuth, addToCart)
router.delete('/cart/:id', userAuth, removeFromCart)
router.put('/cart/:id', userAuth, updateQuantity)

router.post('/add-review',userAuth , addReview)


export default router