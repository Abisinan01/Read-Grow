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

        console.log(req.body)
        const user = req.user
        const {
            addressId,
            paymentMethod,
            subTotal,
            shippingCharge,
            finalPrice,
            discount,
            currency,
            receipt,
            notes

        } = req.body
 

        const options = {
            amount: finalPrice * 100,
            currency,
            receipt,
            notes
        }


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

            items.push({
                productId: product._id,
                productName: product.name,
                price: product.price,
                quantity: item.quantity,
            })

            product.stock -= item.quantity
            await product.save()
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
            paymentStatus:"paid",
            totalAmount: parseInt(finalPrice)
        })

        const saveOrder = await newOrder.save()
        req.session.order = newOrder;
        req.session.save((err) => {
            if (err) {
                console.log("Session save error:", err);
            }
            console.log('Session saved')
        });


        if (!saveOrder) {
            return res.json({
                success: false, message: "Order failed"
            })
        }

 
        //========
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

            const temp = req.session.order// come from create order     
            req.session.order = temp
            res.status(200).json({ status: "Ok" })
        } else {
            res.status(400).json({ message: "payment verification failed" })
        }

    } catch (error) {
        console.log(error.message)
        res.status(500).json({ status: "error", message: "Error verifying payment" })
    }
}

