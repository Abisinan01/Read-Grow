import { render } from "ejs"
import Order from "../../models/orderSchema.js"
import AppError from "../../utils/errorHandler.js"
import Address from "../../models/addressSchema.js"
import mongoose from "mongoose"
import User from "../../models/userSchema.js"
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js"
import Wallet from "../../models/walletSchema.js"


export const getOrderPage = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        let skip = (page - 1) * limit;

        const allOrders = await Order.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        if (!allOrders.length) {
            return res.status(404).render('admin/orders', {
                allOrders: null,
                limit,
                page,
                skip,
                totalOrders: null,
                totalPages: null,
            })
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
            .populate('coupon')

        if (!order) {
            return res.status(404).redirect('/admin/orders')
        }

        console.log(order)
        const user = await User.findById(order.userId)

        let index
        order.items.forEach(item => {
            if (item.productId.toString() == productId) {
                index = order.items.indexOf(item)
            }
        });

        const viewOrder = await Product.findById(order.items[index].productId)
        console.log(viewOrder, 'vieworder')

        return res.render('admin/orderDetails', {
            order, index
            , user, viewOrder
        })

    } catch (error) {
        next(new AppError(` viewOrder detials : ${error}`, 500))
    }
}

export const updateStatus = async (req, res, next) => {
    try {
        const { action, productId } = req.body;
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const index = order.items.findIndex(item => item.productId.toString() === productId);
        if (index === -1) {
            return res.status(404).json({ success: false, message: "Product not found in the order" });
        }

        const item = order.items[index];

        switch (action) {
            case "Pending":
                if (item.status !== "Cancelled") {
                    item.status = "Pending";
                } else {
                    return res.status(400).json({ success: false, message: "Product already cancelled" });
                }
                break;

            case "Cancelled":
                if (item.status === "Delivered") {
                    return res.status(400).json({ success: false, message: "Delivered items cannot be cancelled" });
                }
                item.status = "Cancelled";
                item.isCancelled = true;
                break;

            case "Delivered":
                if (item.status === "Cancelled") {
                    return res.status(400).json({ success: false, message: "Cancelled items cannot be marked as Delivered" });
                }
                item.status = "Delivered";
                item.isReturned = false;
                order.paymentStatus = "paid";
                break;

            case "Returned":
                if (item.status === "Delivered") {
                    item.status = "Returned";
                    item.isReturned = true;
                    order.paymentStatus = 'refunded';
                } else {
                    return res.status(400).json({ success: false, message: "Only delivered items can be returned" });
                }
                break;

            default:
                return res.status(400).json({ success: false, message: "Invalid status action" });
        }

        if (order.items.every(item => item.status === "Delivered")) {
            order.status = "Delivered";
        } else if (order.items.every(item => item.status === "Cancelled")) {
            order.status = "Cancelled";
        } else if (order.items.some(item => item.status === "Returned")) {
            order.status = "Returned";
        }

        await order.save();
        return res.status(200).json({ success: true, message: "Status updated successfully" });

    } catch (error) {
        next(new AppError(`Update status failed: ${error.message}`, 500));
    }
};


export const acceptReturn = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const orderId = req.params.orderId;

        try {
            console.log(productId, orderId, 'req.params');

            const order = await Order.findById(orderId).populate('coupon');
            const product = await Product.findById(productId);
            const user = req.user;

            let wallet = await Wallet.findOne({ userId: order.userId });
            console.log("wallet", wallet);

            const remainingItems = order.items.filter(item =>
                item.status !== 'Cancelled' && item.status !== 'Returned'
            );
            console.log("remainingItems", remainingItems);

            const totalOfRemaining = remainingItems.reduce((total, item) => 
                total + (item.price * item.quantity), 0
            );
            console.log("totalOfRemaining", totalOfRemaining);

            const meetsMinimumAmount = totalOfRemaining >= (order?.coupon?.minPurchase || 0);
            console.log("meetsMinimumAmount", meetsMinimumAmount);

            let refundAmount = 0;

            if (!meetsMinimumAmount && order.discount) {
                refundAmount = order.discount; 
                order.discount = 0;
            } else {
                const returnedItem = order.items.find(item => item.productId.toString() === productId);
                refundAmount = returnedItem ? returnedItem.price * returnedItem.quantity : 0;
            }

            const transaction = {
                orderId: new mongoose.Types.ObjectId(orderId),
                amount: Number(refundAmount),
                transactionType: "credit",
                createdAt: Date.now()
            };
            console.log('transaction', transaction);

            if (!wallet) {
                wallet = await Wallet.create({
                    userId: user.id,
                    balance: Number(refundAmount),
                    transactions: [transaction]
                });
            } else {
                await Wallet.findByIdAndUpdate(wallet._id, {
                    $push: { transactions: transaction },
                    $inc: { balance: Number(refundAmount) }
                });
            }

            for (let item of order.items) {
                if (item.productId.toString() === productId) {
                    await Order.findOneAndUpdate(
                        { _id: order._id, "items.productId": item.productId },
                        {
                            $set: {
                                "items.$.isRequested": false,
                                "items.$.status": "Returned",
                                "items.$.isReturned": true,
                                "items.$.paymentStatus": 'refunded'
                            }
                        },
                        { new: true }
                    );
                }

                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { stock: item.quantity }
                });
            }

            if (order.items.every(item => item.status === "Delivered")) {
                order.status = "Delivered";
            } else if (order.items.every(item => item.status === "Cancelled")) {
                order.status = "Cancelled";
            } else if (order.items.every(item => item.status === "Returned")) {
                order.status = "Returned";
            } else if (order.items.some(item => item.status === "Returned")) {
                order.status = "Partial Return";
            }

            await order.save();

            return res.status(200).json({
                success: true,
                message: "Order returned successfully",
                refundAmount,
                walletBalance: wallet.balance,
                order
            });

        } catch (error) {
            next(new AppError(`Return order failed: ${error}`, 500));
        }

    } catch (error) {
        next(new AppError(`Accept return failed: ${error}`, 500));
    }
};



export const rejectReturn = async (req, res, next) => {
    const productId = req.params.productId
    const orderId = req.params.orderId
    try {
        const order = await Order.findById(orderId)
        const product = await Product.findById(productId)
        const user = req.user


        for (let item of order.items) {
            const update = await Order.findOneAndUpdate(
                { _id: order._id, "items.productId": item.productId },
                {
                    $set: {
                        "items.$.isRequested": false,
                    }
                },
                { new: true }
            );
        }
        return res.status(200).json({ success: true, message: "Request rejected" })
    } catch (error) {
        next(new AppError(`Reject return request failed ${error}`, 500))
    }
}