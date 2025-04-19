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
import Offer from "../../models/offersSchema.js"



export const renderHomePage = async (req, res, next) => {
    try {
        const token = req.cookies.jwt // TOKEN
        let user = null
        if (req.session.order) req.session.order = null//ORDER CONFIRMATION PAGE SESSION MANAGE

        // console.log("token data : ",token)

        // THIS FOR FORCEFULLY REMOVING USER WHEN ITS BLOCKED OR UNAVAILABLE
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                user = decoded

                const isUser = await User.findById(user.id, { role: "user" })
                if (!isUser) {
                    res.clearCookie("jwt")
                    return res.redirect('/read-and-grow')
                }

            } catch (error) {
                console.log('Invalid jwt :', error)
            }
        }

        //FOR SHOWING MOST SELLED PRODUCTS 
        const orders = await Order.aggregate([
            { $match: { isBlocked: { $ne: true } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.productId", totalQty: { $sum: "$items.quantity" } } },
            { $sort: { "items.quantity": -1 } },
            { $limit: 3 }
        ])


        const products = []
        for (let order of orders) {
            const product = await Product.findById(order._id)
            products.push(product)
        }

        console.log(products)//DEBUG
        return res.render('user/home', { products, user })

    } catch (error) {
        return next(new AppError(`User Dashboard failed : ${error} `, 500))
    }
}


export const renderProductDetails = async (req, res, next) => {
    try {
        const { id } = req.params;// 
        const user = req.user

        const product = await Product.findById(id)
            .populate('offers')//LOOKUP OFFERS

        if (!product) {
            return res.status(400).json({
                success: false,
                message: "Product not found"
            });
        }

        let currentDate = new Date()
        //FOR REMOVING EXPIRED OFFERS
        await Offer.updateMany(
            { validTo: { $lt: currentDate } },
            { $set: { status: false } }
        )

        const category = await Category.findOne({ categoryName: product.category })
            .populate('offers') //LOOKUP OFFERS

        // FINDING RELATED PRODUCTS
        const relatedProducts = await Product.find(
            { category: product.category, _id: { $ne: id } }
        );


        let wishlistItems = []
        const wishlist = await Wishlist?.findOne({ userId: user.id })
        if (wishlist) {
            for (let item of wishlist?.items) {
                const product = await Product.findById(item.productId).lean()
                if (product) {
                    wishlistItems.push(product)
                } else {
                    console.log(`No product found`)
                    // return res.status(400).json({ success: false, message: "No products found" })
                }
                wishlistItems.push(product)
            }

        }

        let cartItems = []
        const cart = await Cart.findOne({ userId: user.id })
        if (cart) {
            for (let item of cart.items) {
                const product = await Product.findById(item.productId)
                if (!product) {
                    console.log(`No product found`)
                    // return res.status(400).json({ success: false, message: "No products found" })
                }
                cartItems.push(product)
            }
        }
        console.log(cartItems, 'cartItems')//DEBUG
        const date = new Date(product.createdAt).toDateString();// SHOWING UPDATED DATE OF PRODUCT


        res.render("user/product", {
            product,
            date,
            user: req.user,
            relatedProducts,
            wishlistItems,
            // bestOffer,
            cartItems
        });

    } catch (error) {
        return next(new AppError(`Product details page : ${error}`, 500))
    }
};


export const renderShopPage = async (req, res, next) => {
    try {
        const user = req.user;
        const category = req.query.category || '';
        const author = req.query.author || '';
        const search = req.query.search || '';
        const price = req.query.price || '';
        let page = req.query.page || 1;
        let limit = req.query.limit || 6;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 6;
        let skip = (page - 1) * limit;

        let query = { isBlocked: { $ne: true } };//QUERYING DATA SET TO AN OBJECT FOR SIMPLYFING CODE WE CAN ALSO SET WRITE MANUALLY MONGODB

        if (category) {
            query.category = category;
        }

        if (author) {
            query.authorName = { $regex: author, $options: "i" };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { authorName: { $regex: search, $options: 'i' } }
            ];
        }

        if (price) { // FILTER PRICE RANGES
            switch (price) {
                case 'under-399':
                    query.price = { $lt: 399 };
                    break;
                case '400-599':
                    query.price = { $gte: 400, $lte: 599 };
                    break;
                case 'above-600':
                    query.price = { $gt: 600 };
                    break;
            }
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const categories = await Category.find({ status: { $ne: "inactive" } });// FOR FETCHING ACTIVE CATEGORIES

        //FOR FIND WISHLIST ALREADY INCUDED PRODUCT 
        let wishlistItems = [];
        const wishlist = await Wishlist?.findOne({ userId: user.id });
        if (wishlist) {
            for (let item of wishlist?.items) {
                try {
                    const product = await Product.findById(item.productId).lean();
                    if (product) {
                        wishlistItems.push(product);
                    }
                } catch (itemError) {
                    console.error(`Error fetching wishlist item: ${itemError.message}`);
                }
            }
        }

        let cartItems = []
        const cart = await Cart.findOne({ userId: user.id })

        if (cart) {
            for (let item of cart.items) {
                const product = await Product.findById(item.productId)
                // if (!product) {
                //     console.log(`No product found`)
                //     return res.status(400).json({ success: false, message: "No products found" })
                // }
                cartItems.push(product)

            }
        }
        console.log(cartItems, 'cartItems')

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const responseData = {
            success: true,
            allProducts: products,
            totalProducts,
            totalPages,
            page,
            limit,
            price: price || "",
            search: search || "",
            category: category || "",
            author: author || "",
            categories,
            errorMessage: products?.length === 0 ? "No products found." : null,
            user: req.user,
            wishlistItems,
            cartItems,
            currentSort: ""
        };

        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {//FETCH WITHOUT RENDERING
            return res.status(200).json(responseData);
        }

        return res.render("user/shop", responseData);
    } catch (error) {
        console.error('Shop page error:', error);
        next(new AppError(`Shop product error: ${error.message}`, 500));
    }
};


export const sortProducts = async (req, res, next) => {
    try {
        console.log("jello")
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        const sort = req.params.sort;//SORT TYPE
        console.log("Order sort:", sort);

        let sortCondition = {};

        switch (sort) {
            case "name_asc":
                sortCondition = { name: 1 };
                break;
            case "name_desc":
                sortCondition = { name: -1 };
                break;
            case "price_asc":
                sortCondition = { price: 1 };
                break;
            case "price_desc":
                sortCondition = { price: -1 };
                break;
            default:
                sortCondition = { createdAt: -1 };
        }

        console.log("sortCondition", sortCondition)//DEBUG
        const products = await Product.find({ isBlocked: false })
            .sort(sortCondition)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments({ isBlocked: false });
        const totalPages = Math.ceil(totalProducts / limit);

        return res.render("user/shop", {
            allProducts: products,
            page, limit,
            totalPages,
            success: true,
            price: req.query.price || "",
            search: req.query.search || "",
            category: null,
            author: req.query.author || "",
            categories: [],
            errorMessage: products.length === 0 ? "No products found." : null,
            user: req.user,
            wishlistItems: [],
            currentSort: sort || ''
        });
    } catch (error) {
        next(new AppError(`Product sorting failed: ${error.message}`, 500));
    }
};
