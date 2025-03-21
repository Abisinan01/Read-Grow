import express from "express"
const router = express.Router()
import userAuth from "../middlewares/userAuth.js"
import {
    addToCart,
    addToWishlist,
    confirmOrder,
    deleteWishlist,
    orderConfirmed,
    removeFromCart,
    renderCartManagment,
    renderCheckoutPage,
    renderWishListPage,
    updateQuantity
} from "../controllers/user/shopingCartController.js"


router.get('/wishlist', userAuth, renderWishListPage)
router.post('/wishlist/add', userAuth, addToWishlist)
router.delete('/wishlist/remove/:id', userAuth, deleteWishlist)

router.get('/cart', userAuth, renderCartManagment)
router.post('/cart', userAuth, addToCart)
router.delete('/cart/:id', userAuth, removeFromCart)
router.put('/cart/:id', userAuth, updateQuantity)

router.get('/checkout/:id', userAuth, renderCheckoutPage)
router.post('/confirm-order', userAuth, confirmOrder)
router.get('/confirm-order', userAuth, orderConfirmed)



export default router