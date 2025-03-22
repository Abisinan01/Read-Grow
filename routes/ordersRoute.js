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


router.get('/orders', userAuth, renderOrdersPage)
router.get('/order-details/:id', userAuth, renderOrderDetailsPage)
// router.delete('/cancel-order/:orderId', userAuth, cancelOrders)
router.delete('/single-cancel-order/:orderId/:productId', userAuth, singleCancelOrder)

router.get('/generate-invoice/:orderId', userAuth, generateInvoice)

router.delete('/return-order/:orderId/:productId', userAuth, returnOrder)
export default router 