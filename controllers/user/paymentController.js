import Razorpay from "razorpay";
import crypto from "crypto"
import express from "express"
import { fstat } from "fs";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";
import { razorpay, readData, writeData } from "../../services/payment.js";
import Product from "../../models/productSchema.js";
import Cart from "../../models/cartSchema.js";
import Order from "../../models/orderSchema.js";
import Address from "../../models/addressSchema.js";
const app = express()



export const createOrder = async (req, res) => {
    try {
        console.log("createOrder",req.body)
        const user = req.user
        const {
            finalPrice,
            currency,
            receipt,
            notes

        } = req.body 
        
        const options = {
            amount:Math.round(finalPrice * 100),
            currency,
            receipt,
            notes
        } 
 
        console.log(options,'options')
        const order = await razorpay.orders.create(options);
 
        const orders = readData();
        orders.push({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: 'created'
        })

        writeData(orders)
        res.json(order)

    } catch (error) {
        console.log(error.message)
        res.status(500).send("Error on creating order")
    }
}    
  
export const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    console.log('verify payment', req.body)
    const secret = razorpay.key_secret
    const body = razorpay_order_id + '|' + razorpay_payment_id
    try {
        const isValidSignature = validateWebhookSignature(body, razorpay_signature, secret)
        if (isValidSignature) {
            const orders = readData()
            const order = orders.find(o => o.order_id === razorpay_order_id)

            if (order) {
                order.status = 'paid',
                    order.payment_id = razorpay_payment_id,
                    writeData(orders)
            }

            res.status(200).json({ status: "Ok" })

        } else {
            res.status(400).json({ message: "payment verification failed" })
        }

    } catch (error) {
        console.log(error.message)
        res.status(500).json({ status: "error", message: "Error verifying payment" })
    }
}


export const failedPayment = async (req,res)=>{
    try {
        const {
            addressId,
            paymentMethod,
            subTotal,
            shippingCharge,
            finalPrice,
            discount, 
            paymentStatus
        } = req.body
        console.log("failed",req.session.order)
         
        const user = req.user
        let address = await Address.findById(addressId)
        console.log('Delivery Address :', address)

        if (!address) {
            address = await Address.findOne({ userId: user.id, isDefault: true });
            console.log(2, address)
            if (!address) {
                return res.status(400).json({
                    success: false,
                    message: "Please select address"
                })
            }
        }

        const totalAmount = req.session.orderDetails
        console.log("totalAmount : ", totalAmount)

        const orderID = `ORD-${Date.now()}`;
        console.log("orderID :", orderID)

        const cart = await Cart.findOne({ userId: user.id })

        let items = []
        for (let item of cart.items) {
            const product = await Product.findById(item.productId)

            if (!product) {
                console.log(`Not product found in this cart`)
                throw new Error('Product not found in cart')
            }

            if (product.stock === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Out of stock`
                })
            }

            console.log(items,'items')
            items.push({
                productId: product._id,
                productName: product.name,
                price: product.price,
                quantity: item.quantity,
            })


        }
        
        const newOrder = new Order({
            userId: user.id,
            orderId: orderID,
            addressId: address._id,
            payment: paymentMethod,
            items,
            shippingCharge: parseInt(shippingCharge),
            discount: parseInt(discount),
            subTotal: parseInt(subTotal),
            totalAmount: parseInt(finalPrice),
            paymentStatus : "failed"
        })


        const saveOrder = await newOrder.save()
        console.log(`New order saved ${saveOrder}`)
        
        if (!saveOrder) {
            return res.json({
                success: false, message: "Order failed"
            })
        } 

        await Cart.findByIdAndUpdate(cart._id,{$set:{items:[]}})
        req.session.order = saveOrder 
        return res.status(400).json({
            success: true, message: "Payment failed"
        })
         
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:"Failed payment something went wrong"})
    }
} 
 

export const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log(orderId, 'retrypayment');

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        for (let item of order.items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }

            if (product.stock === 0) {
                return res.status(400).json({ success: false, message: "Out of stock" });
            } else if (item.quantity > product.stock) {
                return res.status(400).json({ success: false, message: "Insufficient quantity" });
            }
        }

        for (let item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }

        await Order.findByIdAndUpdate(order._id, {
            $set: { paymentStatus: "paid" }
        });

        return res.status(200).json({ success: true, message: "Payment successfully done" });

    } catch (error) {
        console.error("Error in retryPayment:", error.message);
        return res.status(500).json({ success: false, message: "Retry payment failed" });
    }
};
