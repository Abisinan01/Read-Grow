import mongoose from "mongoose"
import bcrypt from "bcrypt"
import User from "../../models/userSchema.js"
import jwt from "jsonwebtoken"
import OTP from "../../models/otpSchema.js"
import { sendOTP } from "../otpController.js"
import AppError from "../../utils/errorHandler.js"
import { appengine } from "googleapis/build/src/apis/appengine/index.js"
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js"
import Address from "../../models/addressSchema.js"
import Cart from "../../models/cartSchema.js"
import Wishlist from "../../models/wishListSchema.js"
import Order from "../../models/orderSchema.js"





//==========================CHECKOUT MANAGEMENT===============================


export const renderCheckoutPage = async (req, res, next) => {
    try {
        const user = req.user
        const cartId = req.params.id
        const address = await Address.find({ userId: user.id })

        const userCart = await Cart.findById(cartId)

        if (userCart.items.length <= 0) {
            return res.status(400).redirect('/read-and-grow/shop')
        }

        let finalPrice = 0
        let subTotal = 0
        const checkoutProducts = []
        for (let item of userCart.items) {
            const product = await Product.findById(item.productId).lean()

            if (!product) {
                console.log(`Not product found in this cart`)
                throw new Error('Product not found in cart')
            }

            subTotal += (product.price * item.quantity)
            finalPrice += (product.price * item.quantity)// minus all discounts
            checkoutProducts.push(product);

        }

        req.session.orderDetails = finalPrice.toFixed(2)

        console.log("checkoutProducts", checkoutProducts)
        console.log("finalPrice : ", finalPrice)

        res.render('user/checkout', {
            user,
            address,
            finalPrice,
            checkoutProducts,
            userCart,
            subTotal
        })
    } catch (error) {
        next(new AppError(`Checkout page : ${error}`, 500))
    }
}


export const confirmOrder = async (req, res, next) => {
    try {
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
        console.log(req.body)

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Please select payment method"
            })
        }
        console.log("paymentMethod :", paymentMethod)

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
            totalAmount: parseInt(finalPrice)
        })


        const saveOrder = await newOrder.save()

        if (!saveOrder) {
            return res.json({
                success: false, message: "Order failed"
            })
        }

        req.session.order = saveOrder
        return res.status(200).json({
            success: true, message: "Order confirmed"
        })
    } catch (error) {
        next(new AppError(`Checkout Confirm order : ${error}`, 500))
    }

}




export const successPage = async (req, res, next) => {
    try {
        const userId = req.user
        if (!req.session.order) {
            return res.redirect('/read-and-grow/home')
        }
        const user = await User.findById(userId.id)
        const orders = await Order.findById(req.session.order._id);
        console.log("Order detials : ", orders)
        const cart = await Cart.findOneAndUpdate(
            { userId: user._id },
            {
                $unset: { items: "" }
            }, { new: true }
        )

        req.session.order = null
        return res.render('user/orderConfirmed', {
            user,
            orders
        })
    } catch (error) {
        next(new AppError(`Order confimation falied : ${error}`, 500))
    }
}