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
import Offer from "../../models/offersSchema.js"
import Coupon from "../../models/couponSchema.js"
import { count } from "console"





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

        const offers = await Offer.find()
        let currentDate = new Date
        for (let offer of offers) {
            if (currentDate > offer.validTo) {
                await Offer.findByIdAndUpdate(offer._id, { $set: { status: false } })
            }
        }

        const coupons = await Coupon.find({ isActive: true })
            .sort({ createdAt: -1 })
        for (let coupon of coupons) {
            if (currentDate > coupon.expiryDate) {
                await Offer.findByIdAndUpdate(coupon._id, { $set: { isActive: false } })
            }

        }



        let subTotal = 0
        let totalDiscount = 0
        let bestOffer
        let shippingCharge = 99
        let finalPrice = shippingCharge
        const checkoutProducts = []
        for (let item of userCart.items) {
            const product = await Product.findById(item.productId).lean()
                .populate('offers')

            const category = await Category.findOne({ categoryName: product.category })
                .populate('offers')

            // if (product.offers || category.offers) {
            //     let categoryOffer = category.offers.length > 0
            //         ? category.offers.reduce((acc, curr) =>
            //             (curr.status === true && curr.discountPercentage >= acc.discountPercentage) ? curr : acc
            //         )
            //         : null;
            //     console.log("Category Offer:", categoryOffer);

            //     let productOffer = product.offers.length > 0
            //         ? product.offers.reduce((acc, curr) =>
            //             (curr.status === true && curr.discountPercentage > acc.discountPercentage) ? curr : acc
            //         )
            //         : null;

            //     console.log("Product Offer:", productOffer);

            //     productOffer = productOffer && productOffer.discountPercentage > 0 ? productOffer : null;
            //     categoryOffer = categoryOffer && categoryOffer.discountPercentage > 0 ? categoryOffer : null;

            //     if (productOffer && categoryOffer) {
            //         bestOffer = (productOffer.discountPercentage > categoryOffer.discountPercentage) ? productOffer : categoryOffer;
            //     } else {
            //         bestOffer = productOffer || categoryOffer;
            //     }
            // }

            if (!product) {
                console.log(`Not product found in this cart`)
                throw new Error('Product not found in cart')
            }

            let discountValue = (product.bestOffer / 100) * product.price
            console.log(product.bestOffer, 'dosfjdlsfj')
            subTotal += (product.price * item.quantity)// fixed amount
            totalDiscount += discountValue
            console.log(totalDiscount)

            finalPrice += (product.price * item.quantity) - discountValue  // minus all discounts

            // await Product.findByIdAndUpdate(product._id, { $set: { bestOffer: bestOffer?.discountPercentage } })// can pass offer id
            checkoutProducts.push(product);
        }

        let appliedCoupon
        if (req.session.applyCoupon) {
            finalPrice = req.session.applyCoupon.totalAmount
            appliedCoupon = req.session.applyCoupon.coupon
        }

        console.log("finalPrice : ", finalPrice)
        req.session.orderDetails = finalPrice

        console.log("checkoutProducts", checkoutProducts)
        res.render('user/checkout', {
            user,
            address,
            finalPrice,
            checkoutProducts,
            userCart,
            subTotal,
            shippingCharge,
            totalDiscount : totalDiscount,
            coupons,
            appliedCoupon
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
            paymentStatus,
            subTotal,
            shippingCharge,
            finalPrice,
            discount,
            // currency,
            // receipt,
            // notes 

        } = req.body
        console.log(req.body, 'confimr order req.body')

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

        const cart = await Cart.findOne({ userId: user?.id })

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

            const discountPriceEachProduct = (product.bestOffer / 100) * product.price
            items.push({
                productId: product._id,
                productName: product.name,
                price: Number(product.price),
                quantity: item.quantity,
                discountPrice: Number(discountPriceEachProduct)
            })

            product.stock -= item.quantity
            await product.save()
        }

        const coupon = req.session.applyCoupon

        console.log(coupon)
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
            paymentStatus: paymentStatus,
            coupon: coupon?.coupon?._id
        })

        req.session.applyCoupon = null // this removing current applied coupon

        const saveOrder = await newOrder.save()
        console.log(`New order saved ${saveOrder}`)

        if (!saveOrder) {
            return res.json({
                success: false, message: "Order failed"
            })
        }

        await Cart.findByIdAndUpdate(cart._id, { $set: { items: [] } })
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
        console.log("req.session.order", req.session.order)

        if (!req.session.order) {
            return res.redirect('/read-and-grow/home')
        }
        const user = await User.findById(userId.id)
        const orders = await Order.findById(req.session.order._id);
        console.log("Order detials : ", orders)

        req.session.order = null
        return res.render('user/orderConfirmed', {
            user,
            orders
        })
    } catch (error) {
        next(new AppError(`Order confimation falied : ${error}`, 500))
    }
}


export const applyCoupon = async (req, res, next) => {
    try {
        const { couponCode, totalAmount } = req.body
        const user = req.user
        console.log(req.body)
        const coupon = await Coupon.findOne({ couponCode })
        if (!coupon) {
            return res.status(400).json({ success: false, message: "Invalid coupon code" })
        }

        if (coupon.isUsed.some(id => id.toString() === user.id)) {
            return res.status(400).json({ success: false, message: 'Already used this coupon' });
        }

        if (new Date > coupon.expiryDate) {
            return res.status(400).json({ success: false, message: "Coupon has expired" })
        }

        if (totalAmount < coupon.minPurchase) {
            return res.status(400).json({ success: false, message: `Minimum purchase is ${coupon.minPurchase}` })
        }

        let discountAmount = coupon.discountValue

        if (discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount
        }

        let totalAmountWithCoupon = totalAmount - discountAmount
        req.session.applyCoupon = { coupon, totalAmount: totalAmountWithCoupon }
        console.log("req.session.applyCoupon ", req.session.applyCoupon)

        coupon.isUsed.push(req.user?.id)
        await coupon.save()

        return res.status(200).json({
            success: true,
            message: `Coupon applied coupon applied  You saved ₹${discountAmount.toFixed(2)}`,
            totalAmountWithCoupon
        })
    } catch (error) {
        next(new AppError(`Apply coupon failed ${error}`, 500))
    }
}


export const removeCoupon = async (req, res, next) => {
    try {
        const { couponId } = req.body;
        const user = req.user;
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        if (coupon.isUsed.includes(user.id.toString())) {
            await Coupon.findByIdAndUpdate(couponId, {
                $pull: { isUsed: user.id }
            });

            req.session.applyCoupon = null
            return res.status(200).json({ success: true, message: "Coupon removed" });
        }

        return res.status(400).json({ success: false, message: "Coupon not removed, not found in used list" });

    } catch (error) {
        next(new AppError(`Remove coupon failed: ${error.message}`, 500));
    }
};
