import express from "express"
const router = express.Router()
import userAuth from "../middlewares/userAuth.js"
import {
   // cancelOrders,
   generateInvoice,
   renderOrderDetailsPage,
   renderOrdersPage,
   returnOrder,
   singleCancelOrder
} from "../controllers/user/orderController.js"
import {
   confirmOrder,
   renderCheckoutPage,
   successPage
} from "../controllers/user/checkoutController.js"
import { createOrder, verifyPayment } from "../controllers/user/paymentController.js"


router.get('/checkout/:id', userAuth, renderCheckoutPage)
router.post('/confirm-order', userAuth, confirmOrder)
router.get('/success', userAuth, successPage)

router.post('/create-order', userAuth, createOrder)
router.post('/verify-payment', userAuth, verifyPayment)
 

router.get('/orders', userAuth, renderOrdersPage)
router.get('/order-details/:id', userAuth, renderOrderDetailsPage)
router.delete('/single-cancel-order/:orderId/:productId', userAuth, singleCancelOrder)

router.get('/generate-invoice/:orderId', userAuth, generateInvoice)

router.delete('/return-order/:orderId/:productId', userAuth, returnOrder)
export default router 