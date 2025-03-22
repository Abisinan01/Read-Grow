import { render } from "ejs"
import Order from "../../models/orderSchema.js"
import AppError from "../../utils/errorHandler.js"
import Address from "../../models/addressSchema.js"
import mongoose from "mongoose"
import User from "../../models/userSchema.js"
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js"


export const getOrderPage = async (req, res, next) => {
    try {
        let { page = 1, limit = 5 } = req.query;  
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 5;
        let skip = (page - 1) * limit;

    

        const allOrders = await Order.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(); 

       
        if (!allOrders.length) {
            return res.status(404).json({
                success: false,
                message: "No orders found"
            });
        }

 
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        if (req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.json({
                success: true,
                allOrders,
                totalOrders,
                totalPages,
                limit,
                page
            });
        }

        return res.render('admin/orders', {
            allOrders,
            limit,
            page,
            skip,
            totalOrders,
            totalPages,
        });

    } catch (error) {
        next(new AppError(`Admin order management error: ${error}`, 500));
    }
};


export const viewOrder = async (req, res, next) => {
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


export const updateStatus = async (req, res, next) => {
    try {
        const { action, productId } = req.body
        const orderId = req.params.orderId
        console.log(action, productId)

        const order = await Order.findById(orderId)

        let index
        order.items.forEach(item => {
            if (item.productId.toString() == productId) {
                index = order.items.indexOf(item)
            }
        });
        console.log(order.items[index].productId)


        switch (action) {
            case "Pending":
                if (order.items[index].status !== "Cancelled") {
                    order.items[index].status = "Pending";
                    await order.save();
                    return res.status(200).json({ success: true, message: "Status Updated" });
                } else {
                    return res.status(400).json({ success: false, message: "Product already cancelled" });
                }

            case "Cancelled":
                if (order.items[index].status === "Delivered") {
                    return res.status(400).json({ success: false, message: "Delivered items cannot be cancelled" });
                }
                order.items[index].status = "Cancelled";
                order.items[index].isCancelled = true;
                await order.save();
                return res.status(200).json({ success: true, message: "Status Updated" });

            case "Delivered":
                if (order.items[index].status === "Cancelled") {
                    return res.status(400).json({ success: false, message: "Cancelled items cannot be marked as Delivered" });
                }
                order.items[index].status = "Delivered";
                await order.save();
                return res.status(200).json({ success: true, message: "Status Updated" });

            case "Returned":
                if (order.items[index].status === "Delivered") {
                    order.items[index].status = "Returned";
                    order.items[index].isReturned = true;
                    await order.save();
                    return res.status(200).json({ success: true, message: "Product returned successfully" });
                } else {
                    return res.status(400).json({ success: false, message: "Only delivered items can be returned" });
                }

            default:
                return res.status(400).json({ success: false, message: "Invalid Entries" });
        }

        // if (order.items.every(item => item.status === "Delivered")) {
        //     order.status = "Delivered";
        // } else if (order.items.every(item => item.status === "Cancelled")) {
        //     order.status = "Cancelled";
        // } else if (order.items.some(item => item.status === "Returned")) {
        //     order.status = "Returned";
        // }
        // await order.save()

        // return res.status(200).json({ success: true, message: "Status updated" })

    } catch (error) {
        next(new AppError(`update status failed ${error}`, 500))
    }
}