import { render } from "ejs"
import Order from "../../models/orderSchema.js"
import AppError from "../../utils/errorHandler.js"
import Address from "../../models/addressSchema.js"
import mongoose from "mongoose"
import User from "../../models/userSchema.js"
import Product from "../../models/productSchema.js"


export const getOrderPage = async (req, res, next) => {
    try {
        const allOrders = await Order.find().sort({ created: -1 })
        console.log(allOrders)

        return res.render('admin/orders', { allOrders })
    } catch (error) {
        next(new AppError(`Admin order managment ${error}`, 500))
    }
}



export const getViewOrder = async (req, res, next) => {
    try {
        const orderId = req.params.orderId
        const productId = req.params.productId

        const order = await Order.findById(orderId)
            .populate("addressId")

        console.log(order)
        const user = await User.findById(order.userId)

        if (!order) {
            return res.json("No orders are available");
        }

        let index
        order.items.forEach(item => {
            if (item.productId.toString() == productId) {
                index = order.items.indexOf(item)
            }
        });
        console.log(index)

        return res.render('admin/orderDetails', {
            order, index
            , user
        })

    } catch (error) {
        next(new AppError(` viewOrder detials : ${error}`, 500))
    }
} 