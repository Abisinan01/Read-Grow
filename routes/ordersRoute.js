import express from "express"
const router = express.Router()
import userAuth from "../middlewares/userAuth.js"
import {
   downloadInvoice,
   payUsingWallet,
   renderOrderDetailsPage,
   renderOrdersPage,
   returnOrder,
   singleCancelOrder
} from "../controllers/user/orderController.js"
import {
   applyCoupon,
   confirmOrder,
   removeCoupon,
   renderCheckoutPage,
   successPage
} from "../controllers/user/checkoutController.js"
import { createOrder, failedPayment, retryPayment, verifyPayment } from "../controllers/user/paymentController.js"
import { generateInvoice } from "../services/invoiceService.js"


router.get('/checkout/:id', userAuth, renderCheckoutPage)
router.post('/apply-coupon', userAuth, applyCoupon)
router.put('/remove-coupon', userAuth, removeCoupon)
router.post('/confirm-order', userAuth, confirmOrder)
router.get('/success', userAuth, successPage)

router.post('/create-order', userAuth, createOrder)
router.post('/verify-payment', userAuth, verifyPayment)
router.post('/failed-payment', userAuth, failedPayment)
router.post('/retry-payment', userAuth, retryPayment)
router.post('/wallet', userAuth, payUsingWallet)

router.get('/orders', userAuth, renderOrdersPage)
router.get('/order-details/:id', userAuth, renderOrderDetailsPage)
router.delete('/single-cancel-order/:orderId/:productId', userAuth, singleCancelOrder)

router.get('/invoice/:orderId', userAuth, downloadInvoice)

router.delete('/return-order/:orderId/:productId', userAuth, returnOrder)
export default router 