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
    renderHomePage, 
    renderProductDetails,
    renderShopPage,
    sortProducts
} from "../controllers/user/shopController.js"


router.get('/home', renderHomePage)
router.get('/product-details/:id', userAuth, renderProductDetails)
router.get("/shop", userAuth, renderShopPage)
router.get('/sort/:sort', userAuth, sortProducts)

router.get('/wishlist', userAuth, renderWishListPage)
router.post('/wishlist/add', userAuth, addToWishlist)
router.delete('/wishlist/remove/:id', userAuth, deleteWishlist)

router.get('/cart', userAuth, renderCartManagment)
router.post('/cart', userAuth, addToCart)
router.delete('/cart/:id', userAuth, removeFromCart)
router.put('/cart/:id', userAuth, updateQuantity)



export default router