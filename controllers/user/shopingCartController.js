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
                if (cart.items[existItemIndex].quantity + 1 > product.stock ) {
                    return res.status(400).json({
                        success: false, message: "No enough stock"
                    })  
                }
                if(cart.items[existItemIndex].quantity + 1 > 3){
                    return res.status(400).json({
                        success: false, message: "Order limit is reached"
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





