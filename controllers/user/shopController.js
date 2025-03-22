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



export const renderHomePage = async (req, res, next) => {
    try {
        const token = req.cookies.jwt
        let user = null
        // console.log("token data : ",token)

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                user = decoded
            } catch (error) {
                console.log('Invalid jwt :', error)
            }
        }
        const products = await Product.find({
            $and: [
                { rating: { $gte: 4.0 } },
                { isBlocked: { $ne: true } }
            ]
        }).limit(3);



        return res.render('user/home', { products, user })

    } catch (error) {
        return next(new AppError(`User Dashboard failed : ${error} `, 500))
    }
}


export const renderProductDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user

        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

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
                }
            }
        }

        const date = new Date(product.createdAt).toDateString();
        res.render("user/product", {
            product,
            date,
            user: req.user,
            relatedProducts,
            wishlistItems
        });

    } catch (error) {
        return next(new AppError(`Product details page : ${error}`, 500))
    }
};


export const renderShopPage = async (req, res, next) => {
    try {
        const user = req.user
        let { search, category, page, limit, price, author } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 6;
        let skip = (page - 1) * limit;

        let query = { isBlocked: { $ne: true } };

        if (category) {
            query.category = category;
        }

        if (author) {
            query.authorName = { $regex: author, $options: "i" }
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' }
        }

        if (price) {
            if (price === 'under-399') {
                query.price = { $lt: 399 };
            } else if (price === '400-599') {
                query.price = { $gte: 400, $lte: 599 };
            } else if (price === 'above-600') {
                query.price = { $gt: 600 };
            }
        }

        console.log('Query :', query)

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
        products.sort()

        const categories = await Category.find({ status: { $ne: "inactive" } });

        let wishlistItems = []
        const wishlist = await Wishlist?.findOne({ userId: user.id })
        if (wishlist) {
            // wishlistItems = []
            for (let item of wishlist?.items) {
                const product = await Product.findById(item.productId).lean()
                if (product) {
                    wishlistItems.push(product)
                } else {
                    console.log(`No product found`)
                }
            }
        }
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
            wishlistItems
        };

        // if (req.session.order) { req.session.order = null }

        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(200).json(responseData);
        }

        return res.render("user/shop", responseData);
    } catch (error) {
        next(new AppError(`Shop product error: ${error.message}`, 500));
    }
};



export const sortProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        const sort = req.params.sort;
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
                sortCondition = {};  
        }

        
        const products = await Product.find({ isBlocked: false })
            .sort(sortCondition)
            .skip(skip)
            .limit(limit);

      
        const totalProducts = await Product.countDocuments({ isBlocked: false });
        const totalPages = Math.ceil(totalProducts / limit);

     
        return res.render("user/shop", {
            allProducts: products,
            page,limit,
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
        });
    } catch (error) {
        next(new AppError(`Product sorting failed: ${error.message}`, 500));
    }
};
