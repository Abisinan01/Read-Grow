import mongoose from "mongoose"
import bcrypt from "bcrypt"
import User from "../../models/userSchema.js"
import jwt from "jsonwebtoken"
import OTP from "../../models/otpSchema.js"
import { sendOTP } from "../otpController.js"
import AppError from "../../utils/errorHandler.js"
import { appengine } from "googleapis/build/src/apis/appengine/index.js"
import Product from "../../models/productSchema.js"
import nodemailer from "nodemailer"
import Category from "../../models/categorySchema.js"
import Address from "../../models/addressSchema.js"
import Cart from "../../models/cartSchema.js"
import Wishlist from "../../models/wishListSchema.js"
import { status } from "init"
import Order from "../../models/orderSchema.js"

export const renderWishListPage = async (req, res, next) => {
    try {
        const user = req.user;

        let wishlistItems = []
        const wishlist = await Wishlist.findOne({ userId: user.id })

        const itemsToRemove = [];
        if (!wishlist) {
            return res.render('user/wishlist', {
                user,
                wishlist: null,
                wishlistItems: []
            })
        }

        const cart = await Cart.findOne({ userId: user.id })
        for (let item of wishlist.items) {
            const product = await Product.findById(item.productId).lean()

            if (!product) {
                console.log(`Product not found`);
                itemsToRemove.push(item.productId);
                continue;
            }
            if (!cart) {
                res.status(200).json({ success: false, message: "Not cart products" })
            }

            for (let cartItem of cart.items) {
                if (cartItem.productId.toString() === product._id.toString()) {
                    itemsToRemove.push(item.productId);
                    break;
                }
            }

            wishlistItems.push(product)
        }
        console.log("wishlistItems : ", wishlistItems);

        if (itemsToRemove.length > 0) {
            wishlist.items = wishlist.items.filter(item =>
                !itemsToRemove.includes(item.productId.toString()) // Remove items in itemsToRemove
            );
            await wishlist.save();
        }

        return res.render("user/wishlist", {
            user,
            wishlist,
            wishlistItems
        });

    } catch (error) {
        console.error("Wishlist error:", error);
        next(new AppError(`Wishlist failed : ${error}`, 500));
    }
};


export const addToWishlist = async (req, res, next) => {
    try {
        console.log("product id ", req.body)
        const productId = req.body.productId
        const user = req.user

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid or missing product ID" });
        }
        if (!user || !user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let wishlist = await Wishlist?.findOne({ userId: user.id });
        if (!wishlist) {
            wishlist = new Wishlist({
                userId: user.id,
                items: [{ productId }]
            });
        } else {
            if (!wishlist?.items.some(item => item.productId.toString() === productId)) {
                wishlist.items.push({ productId });
            } else {
                return res.status(400).json({ success: false, message: "Product already in wishlist" });
            }
        }

        await wishlist.save()

        return res.status(200).json({
            success: true,
            message: "Added to wishlist"
        })

    } catch (error) {
        next(new AppError(` Wishlist product adding faield : ${error} `, 500))
    }
}


export const deleteWishlist = async (req, res, next) => {
    try {
        const productId = req.params.id
        const user = req.user
        console.log("productId", productId)
        console.log("userId", user.id)

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ success: false, message: "Invalid Product ID format" });
        }
        const validProductId = new mongoose.Types.ObjectId(productId);

        const wishlist = await Wishlist.findOne({ userId: user.id }).select('_id');
        if (!wishlist) {
            return res.status(400).json({ success: false, message: "Wishlist not found" });
        }

        const validWishlistId = new mongoose.Types.ObjectId(wishlist._id)


        const result = await Wishlist.updateOne(
            { _id: validWishlistId, userId: user.id },
            { $pull: { items: { productId: validProductId } } }
        );

        console.log('Updated result : ', result);

        return res.status(200).json({
            success: true,
            message: "Product removed from wishlist"
        })

    } catch (error) {
        next(`wishlist product deletion failed : ${error}`, 500)
    }
}


//=======================CART MANAGMENT==============================

export const renderCartManagment = async (req, res, next) => {
    try {
        const user = req.user
        const cartItems = await Cart?.findOne({ userId: user.id })

        if (cartItems) {
            const product = await Product.findOne({ productId: cartItems?.items?.productId })
        } else {
            return res.render('user/cart', { user, allCartProducts: [], cartItems: [] });
        }

        let allCartProducts = [], totalAmount = 0
        for (let item of cartItems.items) {
            const product = await Product.findById(item.productId).lean()

            if (!product) {
                console.log(`Not product found in this cart pid:${item.productId}`)
            }
            if (product.isBlocked) {
                cartItems.items.pull({ productId: product._id })
                await cartItems.save()
                continue;
            }

            totalAmount += item.quantity * product.price
            const cartProduct = {
                ...product,
                quantity: item.quantity,

            };
            allCartProducts.push(cartProduct);
        }

        const isAvailableStock = allCartProducts.every(product => product.stock >= product.quantity)

        return res.render("user/cart", {
            user,
            allCartProducts,
            cartItems, totalAmount, isAvailableStock
        }) 

    } catch (error) {
        next(new AppError(`Cart managment failed : ${error}`, 500))
    }
}

export const addToCart = async (req, res, next) => {
    try {
        const productId = req.body.productId
        const user = req.user
        console.log("productId : ", productId)
        console.log("user:", user.id)

        const product = await Product.findById(productId)
        // console.log(product)
        if (product.isBlocked || !product) {
            return res.status(400).json({
                success: false,
                message: "Unavailable."
            })
        }
        if (product.stock <= 0) {
            return next(new AppError(`Out of stock`, 400))
        }
        let cart = await Cart.findOne({ userId: user.id })
   
        
        if (cart) {
            const existItemIndex = cart.items.findIndex(
                item => item.productId.toString() === productId.toString()
            )
            if (existItemIndex > -1) {
                if (cart.items[existItemIndex].quantity + 1 > product.stock) {
                    return res.status(400).json({
                        success: false, message: "No enough stock"
                    })  
                }
                cart.items[existItemIndex].quantity += 1;
     

            } else {
                cart.items.push({
                    productId: new mongoose.Types.ObjectId(product._id),
                    quantity: 1,
                    stock: parseInt(product.stock)
                })
 
            }
            const saveCart = (await cart.save()) ? true : false
            if (!saveCart) {
                return res.status(400).json({
                    success: false, message: "Maximum limit reached"
                })
            }
    
        } else {
            const addCart = new Cart({
                userId: new mongoose.Types.ObjectId(user.id),
                items:
                    [
                        {
                            productId: new mongoose.Types.ObjectId(product._id),
                            quantity: 1,
                            stock: parseInt(product.stock)
                        }
                    ]
            })
            await addCart.save()
            await product.save()
        }

        await Wishlist.findOneAndUpdate({userId:user.id},{$unset:{items:""}})

        return res.status(200).json({
            success: true,
            message: "Product is moved to cart"
        })
    } catch (error) {
        next(new AppError(`Add To cart Failed : ${error}`, 500))
    }
}

export const removeFromCart = async (req, res, next) => {
    try {
        const productId = req.params.id
        const user = req.user
        console.log("productId", productId)

        const product = await Product.findById(productId)
        const cartItem = await Cart.findOne({ userId: user.id })
        console.log("cartItem", cartItem)
        const stockCount = cartItem.items.find(p => {
            if (p.productId.toString() == product._id.toString()) return p.quantity
        })
        console.log("stockCount before", stockCount.quantity)

        const updateCart = await Cart.updateOne(
            { userId: user.id },
            {
                $pull: { items: { productId: product._id } }
            }
        )

        // const updateInventory = await Product.updateOne(
        //     { _id: product._id },
        //     { $inc: { stock: stockCount.quantity } }
        // )
        // if (updateInventory) console.log(`Inventory updated ${product.name} ${stockCount}`)

        if (!updateCart) {
            return res.status(200).json({
                success: false,
                message: "Removing failed "
            })
        }
        return res.status(200).json({
            success: true,
            message: "Product is removed from cart"
        })
    } catch (error) {
        next(new AppError(`Remove cart data Failed : ${error}`, 500))
    }
}


export const updateQuantity = async (req, res, next) => {
    try {
        const productId = req.params.id
        const newQty = req.body.quantity
        const minusQty = req.body.minusQty
        const user = req.user

        const product = await Product.findById(productId)
        console.log("current stock:", product.stock)

        const cart = await Cart.findOne({ userId: user.id })
        console.log('cart', cart)
        if (newQty) {
            if (newQty > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: "No enough stock"
                })
            }

            if (newQty > 3) {
                return res.status(400).json({
                    success: false, message: "Quantity maximum 3"
                })
            }
            console.log("newQty :", newQty)
            console.log("current stock:", product.stock)

            const item = cart.items.find(item => item.productId.toString() === product._id.toString())
            if (!item) {
                return res.status(400).json({
                    success: false,
                    message: "Item not found in cart"
                })
            }

            item.quantity += 1
            await cart.save()
        }
        if (minusQty) {

            console.log("newQty :", newQty)
            console.log("current stock:", product.stock)

            const item = cart.items.find(item => item.productId.toString() === product._id.toString())
            if (!item) {
                return res.status(400).json({
                    success: false,
                    message: "Item not found in cart"
                })
            }

            item.quantity -= 1
 
            await cart.save()
            console.log("updated Stock :", product.stock)
        }
        return res.status(200).json({
            success: true,
            message: "Done"
        })
    } catch (error) {
        next(new AppError(`Update quantity failed : ${error}`, 500))
    }
}



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

        let checkoutTotal = 0
        const checkoutProducts = []
        for (let item of userCart.items) {
            const product = await Product.findById(item.productId).lean()

            if (!product) {
                console.log(`Not product found in this cart`)
                throw new Error('Product not found in cart')
            }


            checkoutTotal += (product.price * item.quantity)
            checkoutProducts.push(product);

        }

        req.session.orderDetails = checkoutTotal.toFixed(2)

        console.log("checkoutProducts", checkoutProducts)
        console.log("checkoutTotal", checkoutTotal)

        res.render('user/checkout', {
            user,
            address,
            checkoutTotal,
            checkoutProducts,
            userCart
        })
    } catch (error) {
        next(new AppError(`Checkout page : ${error}`, 500))
    } 
}


export const confirmOrder = async (req, res, next) => {
    try {
        const user = req.user
        const { paymentMethod, addressId } = req.body

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
            console.log(2,address)
            if(!address){
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
                productId : product._id,
                productName:product.name,
                price:product.price,
                quantity:item.quantity,
            })

            product.stock -= item.quantity
            await product.save()
        }

        console.log(items)

        const newOrder = new Order({
            userId: user.id,
            orderId: orderID,
            addressId: address._id,
            payment: paymentMethod,
            items,
            totalAmount: totalAmount
        })


        const saveOrder = await newOrder.save()

        if (!saveOrder) {
            return res.json({
                success: false, message: "Order failed"
            })
        }

        req.session.order = newOrder
        return res.status(200).json({
            success: true, message: "Order confirmed"
        })
    } catch (error) {
        next(new AppError(`Checkout Confirm order : ${error}`, 500))
    }
    
}

export const orderConfirmed = async (req, res, next) => {
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
        return res.render('user/orderConfirmed', {
            user,
            orders
        })
    } catch (error) {
        next(new AppError(`Order confimation falied : ${error}`, 500))
    }
}

