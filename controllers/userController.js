import mongoose from "mongoose"
import bcrypt from "bcrypt"
import User from "../models/userSchema.js"
import jwt from "jsonwebtoken"
import OTP from "../models/otpSchema.js"
import { sendOTP } from "./otpController.js"
import AppError from "../utils/errorHandler.js"
import { appengine } from "googleapis/build/src/apis/appengine/index.js"
import Product from "../models/productSchema.js"
import nodemailer from "nodemailer"
import Category from "../models/categorySchema.js"
import Address from "../models/addressSchema.js"
import Cart from "../models/cartSchema.js"
import Wishlist from "../models/wishListSchema.js"
import { status } from "init"
import Order from "../models/orderSchema.js"




export const renderSignPage = async (req, res, next) => {
    try {
        if (req.cookies.jwt) {
            return res.redirect("/read-and-grow/home")
        }
        return res.render("user/signup.ejs")

    } catch (error) {
        return next(new AppError(`User signup ${req.method} method failed `, 500))
    }
}

export const handleSignupPage = async (req, res, next) => {
    try {
        const { username, password, confirmPassword, email, phoneNumber } = req.body
        // console.log(req.body)
        // console.log(email)

        let StrongPassword = (password === confirmPassword) ? password : false;

        const userExist = await User.findOne({ $or: [{ username }, { email }, { phoneNumber }] })

        if (!username || !email || !phoneNumber || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All Fields are required"
            })
        }

        if (userExist) {
            if (userExist.username == username) {
                console.log(username)
                return res.status(400).json({
                    success: false,
                    message: "Username is already exits"
                })
            }

            if (userExist.email == email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already exist"
                })
            }

            if (userExist.phoneNumber == phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number already exist"
                })

            }
        }
        req.session.temp = email
        const otpResult = await sendOTP(email)
        console.log("Send Otp response :", otpResult)

        if (!otpResult.success) {
            return res.status(500).json(otpResult.message)
        }

        let salt = await bcrypt.genSalt(10)
        let hashPassword = await bcrypt.hash(StrongPassword, salt)
        req.session.temp = {
            username,
            email,
            password: hashPassword,
            phoneNumber
        }
        const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES })

        // console.log('sign up Temp session :', req.session.temp, token)

        return res.status(200).json({
            success: true,
            message: otpResult.message,
            redirect: '/otp/otp-verify',
            token
        })

    } catch (error) {
        res.status(500).json({ success: false, message: "Something went wrong" })
        return next(new AppError(`User signup ${req.method} method failed `, 500))
    }
}



export const renderLoginPage = async (req, res, next) => {
    try {
        if (req.cookies.jwt) {
            return res.redirect('/read-and-grow/home')
        }
        return res.render("user/login")
    } catch (error) {
        return next(new AppError(`User login failed : ${error}`, 500))
    }
}


export const handleLoginPage = async (req, res, next) => {
    try {
        let { username, password } = req.body

        console.log("userLoginPost", req.body)
        const isUser = await User.findOne({ username })

        if (!isUser) {
            return res.status(400).json({ success: false, message: "User not found!" })
        }
        console.log(isUser)
        if (isUser.role == 'admin') {
            return res.status(400).json({ success: false, message: "User is not exist" })
        }

        const comparePassword = await bcrypt.compare(password, isUser.password)

        if (!comparePassword) {
            return res.status(400).json({ success: false, message: "Incorrect password" })
        }

        // req.session.user = { id: isUser._id, username: isUser.username, role: isUser.role }
        // console.log(req.session.user) 

        if (isUser.isBlocked == true) {
            return res.status(400).json({
                success: false,
                message: "User is not avaible"
            })
        }

        //creating JWT
        const token = jwt.sign({ id: isUser._id, username: isUser.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES })
        //Store JWT in cookies
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })

        req.session.user = isUser
        return res.status(200).json({
            success: true,
            message: "successfully logged",
            redirect: "/read-and-grow/home"
        })

    } catch (error) {
        console.log(error)
        return next(new AppError(error, 500))
    }
}


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
        // console.log("Product ID: ", id);

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

        const date = new Date(product.createdAt).toDateString();
        res.render("user/product", {
            product,
            date,
            user: req.user,
            relatedProducts
        });

    } catch (error) {
        return next(new AppError(`Product details page : ${error}`, 500))
    }
};


//==================shoping page =====================
export const renderShopPage = async (req, res, next) => {
    try {
        const user = req.user
        let { search, category, page, limit, price } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 6;
        let skip = (page - 1) * limit;

        let query = { isBlocked: { $ne: true } };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { authorName: { $regex: search, $options: "i" } }
            ];
        }

        // console.log("search",search)

        if (price) {
            if (price === 'under-20') {
                query.price = { $lt: 20 };
            } else if (price === '20-30') {
                query.price = { $gte: 20, $lte: 30 };
            } else if (price === 'above-30') {
                query.price = { $gt: 30 };
            }
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
        
        const categories = await Category.find({ status: { $ne: "inactive" } });
            
        let wishlistItems = []
        const wishlist = await Wishlist.findOne({userId:user.id})
        for(let item of wishlist.items){
            const product = await Product.findById(item.productId).lean()

            if (!product) {
                console.log(`Not product found`)
            }
            wishlistItems.push(product)
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
            price,
            search: search || "",
            category: category || "",
            categories,
            errorMessage: products.length === 0 ? "No products found." : null,
            user: req.user,
            wishlistItems
        };


        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(200).json(responseData);
        }

        return res.render("user/shop", responseData);
    } catch (error) {
        next(new AppError(`Shop product error: ${error.message}`, 500));
    }
};


//==================forgot password================== 
export const renderEmailVerify = async (req, res, next) => {
    try {
        return res.render('user/emailVerify')
    } catch (error) {
        next(new AppError(`Forgot password failed : ${error} `, 500))
    }
}

export const requestPasswordReset = async (req, res, next) => {
    const { email } = req.body
    try {
        console.log(email)
        const user = await User.findOne({ email: email })

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Please give a valid emailId"
            })
        }

        const secret = process.env.JWT_SECRET + user.password;
        const token = jwt.sign({ id: user._id, email: email }, secret, { expiresIn: '1h' });

        const resetURL = `http://localhost:3999/resetPassword?id=${user._id}&token=${token}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            },
        });
        // console.log(transporter)
        const mailOptions = {
            to: email,
            from: process.env.MAIL_USER,
            subject: 'Password Reset Request',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            ${resetURL}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: 'Password reset link sent'
        })
    } catch (error) {
        next(new AppError(`Forgot password failed : ${error} `, 500))
    }
}

export const renderResetPassword = async (req, res, next) => {
    try {
        return res.render('user/forgot')
    } catch (error) {
        next(new AppError(`Forgot password failed : ${error},500`))
    }
}


export const resetPassword = async (req, res, next) => {
    const { id, token } = req.query;
    const { password } = req.body;
    console.log("Reset password :", req.query)

    try {
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(400).json({ message: "User not exists!" });
        }

        const secret = process.env.JWT_SECRET + user.password;

        const verify = jwt.verify(token, secret);
        const encryptedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(
            id,
            {
                $set: {
                    password: encryptedPassword,
                },
            }
        );

        await user.save();

        res.status(200).json({ message: 'Password has been reset' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};



//========User profile===============

export const renderProfilePage = async (req, res, next) => {
    try {
        const token = req.user
        // console.log(req.user)
        const user = await User.findOne({ _id: token.id })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User detailes not found"
            })
        }

        return res.render("user/profile", { user })
    } catch (error) {
        next(new AppError('User profile loading failed'))
    }
}

export const editProfile = async (req, res, next) => {
    try {
        const { username, phoneNumber } = req.body
        const user = req.user
        console.log(req.body)


        await User.findByIdAndUpdate(
            user.id,
            { username, phoneNumber }
        )
        return res.status(200).json({ success: true, message: "Profile updated." })


    } catch (error) {
        next(new AppError(`User profile update Failed : ${error}`, 500))
    }
}


export const renderChangePassword = async (req, res, next) => {
    try {
        const { id } = req.params
        const user = await User.findOne({ _id: id })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User detailes not found"
            })
        }
        return res.render("user/changePassword", { user })
    } catch (error) {
        next(new AppError(`Change password : ${error}`, 500))
    }
}

export const changePasswordRequest = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body
        // console.log(req.body)
        const data = req.user
        const user = await User.findOne({ _id: data.id })

        const comparePassword = await bcrypt.compare(oldPassword, user.password)

        if (!comparePassword) {
            return res.status(400).json({
                success: false,
                message: "Old password is not matching"
            })
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "confirm password is not matching" })
        }

        let salt = await bcrypt.genSalt(10)
        let hashPassword = await bcrypt.hash(newPassword, salt)

        await User.findByIdAndUpdate(
            user._id,
            { password: hashPassword }
        )

        return res.status(200).json({
            success: true,
            message: "Password updated"
        })
    } catch (error) {
        next(new AppError(`Change password : ${error}`, 500))
    }
}

//=====================change Email id=======================
export const renderChangeEmail = async (req, res, next) => {
    try {
        const id = req.params
        const user = await User.findById(id.id)
        req.session.update = user.email
        if (req.session.update) {
            return res.render("user/editEmail", { id })
        } else {
            return res.redirect(`/read-and-grow/profile/${id}`)
        }
    } catch (error) {
        next(new AppError(`Change email : ${error}`, 500))
    }
}


export const changeEmailRequest = async (req, res, next) => {
    try {
        const { email } = req.body
        const id = req.user
        // console.log(email)

        const isExist = await User.findById(id.id)

        if (isExist.email !== email) {
            return res.status(400).json({
                success: false,
                message: "Email is not valid"
            })
        }

        const resetURL = `http://localhost:3999/read-and-grow/new-email/${id.id}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            },
        });
        // console.log(transporter)
        const mailOptions = {
            to: email,
            from: process.env.MAIL_USER,
            subject: 'UPDATE EMAILID',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            ${resetURL}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n,
            `,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: "Please check your email"
        })

    } catch (error) {
        next(new AppError(`change email request failed : ${error}`, 500))
    }
}


export const renderUpdateMail = async (req, res, next) => {
    try {
        if (req.session.update) {
            return res.render("user/updateNewMail", { user: req.user })
        }
        return res.status(404).redirect('/read-and-grow/notFound')
    } catch (error) {
        next(new AppError(`Update Mail failed : ${error}`, 500))
    }
}

export const updateNewMail = async (req, res, next) => {
    try {
        const { email } = req.body
        console.log(email)

        const isExists = await User.findOne({ email: email })
        if (isExists) {
            return res.status(400).json({
                success: false,
                message: "This email is alreeady in use. Please choose another."
            })
        }

        const otpResult = await sendOTP(email)
        console.log("Send Otp response  :", otpResult)

        if (!otpResult.success) {
            return res.status(500).json(otpResult.message)
        }

        req.session.updateNew = email
        return res.status(200).json({
            success: true,
            message: otpResult.message,
            redirect: "/otp/verify"
        })

    } catch (error) {
        next(new AppError(`updateNew Mail : ${id}`))
    }
}


//=======================address Managment===========
export const renderAddressPage = async (req, res, next) => {
    try {
        const user = req.user
        const address = await Address.find({ userId: user.id })
        res.render("user/address", { user, address })
    } catch (error) {
        next(new AppError(`Address page : ${error}`, 500))
    }
}


export const addAddress = async (req, res, next) => {
    try {
        const {
            firstName,
            lastName,
            street,
            city,
            state,
            zip,
            phone,
            addressType
        } = req.body
        const user = req.user
        if (!firstName || !lastName || !street || !city || !state || !zip || !phone) {
            return res.status(400).json({
                success: false,
                message: "Please add your address"
            })
        }
        console.log("Add address :", req.body)
        const phoneNumber = parseInt(phone)

        if (isNaN(phoneNumber)) {
            return res.status(400).json({ success: false, message: "Number must be digits" })
        }
        const newAddress = new Address({
            firstName,
            lastName,
            street,
            city,
            state,
            pincode: zip,
            phoneNumber: parseInt(phone),
            addressType,
            userId: user.id
        })

        await newAddress.save()
        if (!newAddress) {
            return res.status(400).json({
                success: false,
                message: "Address can't save to db"
            })
        }

        return res.status(200).json({
            success: true,
            message: "Address added successfully."
        })

    } catch (error) {
        next(new AppError(`Add address is failed : ${error}`, 500))
    }
}


export const editAddress = async (req, res, next) => {
    try {
        const {
            firstName,
            lastName,
            street,
            city,
            state,
            phone,
            zip,
            addressType
        } = req.body;

        const user = req.user;
        const addressId = req.params.addressId
        console.log("Address edit : ", addressId)

        if (!firstName || !lastName || !street || !city || !state || !phone || !zip || !addressType) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const phoneNumber = parseInt(phone)
        if (isNaN(phoneNumber)) {
            return res.status(400).json({ success: false, message: "Number must be digits" })
        }
        const updateAddress = await Address.findByIdAndUpdate(
            addressId,
            {
                $set: {
                    firstName,
                    lastName,
                    street,
                    city,
                    state,
                    pincode: zip,
                    phoneNumber,
                    addressType,
                }
            });


        if (!updateAddress) {
            return res.status(400).json({
                success: false,
                message: "Address not found or can't be changed."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Address edited successfully.",

        });
    } catch (error) {
        next(new AppError(`Edit address failed: ${error}`, 500));
    }
};


export const deleteAddress = async (req, res, next) => {
    try {
        const id = req.params.id
        console.log(id)
        const deleteAddress = await Address.findByIdAndDelete(id)
        if (!deleteAddress) {
            return res.status(400).json({
                success: false,
                message: "Address not found"
            })
        }

        return res.status(200).json({
            success: true,
            message: "Address deleted."
        })
    } catch (error) {
        next(new AppError(`Address delete failed : ${error}`, 500))
    }
}

export const setDefault = async (req, res, next) => {
    try {
        const addressId = req.params.id
        const isChecked = req.body.isDefault
        console.log("Address set defualt : ", isChecked)

        const address = await Address.findById(addressId)
        if (!address) {
            return res.status(400).json({ success: false, message: "Address not found" })
        }

        if (isChecked) {
            await Address.updateMany(
                { user: address.user, _id: { $ne: addressId } },
                { $set: { isDefault: false } }
            );
        }

        const updateAddress = await Address.findByIdAndUpdate(
            addressId,
            { $set: { isDefault: isChecked } },
            { new: true }
        )

        if (!updateAddress) {
            return res.status(400).json({
                success: false,
                message: "Failed to update address"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Address as set default"
        })
    } catch (error) {
        next(new AppError(`Default address : ${error}`, 500))
    }
}


export const selectAddress = async (req, res, next) => {
    try {
        const addressId = req.params.id
        const isChecked = req.body.isSelected
        console.log("Address is selected : ", isChecked)

        const address = await Address.findById(addressId)
        if (!address) {
            return res.status(400).json({ success: false, message: "Address not found" })
        }

        if (isChecked) {
            await Address.updateMany(
                { user: address.user, _id: { $ne: addressId } },
                { $set: { isSelected: false } }
            );
        }

        const updateAddress = await Address.findByIdAndUpdate(
            addressId,
            { $set: { isSelected: isChecked } },
            { new: true }
        )

        if (!updateAddress) {
            return res.status(400).json({
                success: false,
                message: "Failed to select addresss"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Address is selected"
        })
    } catch (error) {
        next(new AppError(`Default address : ${error}`, 500))
    }
}

//=============================WISHLIST====================

export const renderWishListPage = async (req, res, next) => {
    try {
        const user = req.user;
 
        let wishlistItems = []
        const wishlist = await Wishlist.findOne({userId:user.id})

        const itemsToRemove = [];
        if(!wishlist){
            return res.status(400).json({
                success:false,
                message:"Not found wishlist"
            })
        }

        const cart = await Cart.findOne({userId:user.id})
        for(let item of wishlist.items){
            const product = await Product.findById(item.productId).lean()
            
            if (!product) {
                console.log(`Product not found`);
                itemsToRemove.push(item.productId);
                continue;
            }
            if(!cart){
                res.status(200).json({success:false,message:"Not cart products"})
            }
            
            for(let cartItem of cart.items){       
                if (cartItem.productId.toString() === product._id.toString()) {
                    itemsToRemove.push(item.productId);
                    break;
                }
            }

            wishlistItems.push(product)
        }
        console.log("wishlistItems : ",wishlistItems);

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

        let wishlist = await Wishlist.findOne({ userId: user.id });
        if (!wishlist) {
            wishlist = new Wishlist({
                userId: user.id,
                items: [{ productId }]
            });
        } else {
            if (!wishlist.items.some(item => item.productId.toString() === productId)) {
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
            { $pull: { items: {productId:validProductId } } }
        );

        console.log('Updated result : ',result);

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
        const product = await Product.findOne({ productId: cartItems?.items?.productId })

        if (!cartItems?.items?.length) {
            return res.render('user/cart', { user, allCartProducts: [] });
        }

        let allCartProducts = []
        console.log("cartIems s", cartItems)
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

            const cartProduct = {
                ...product,
                quantity: item.quantity
            };
            allCartProducts.push(cartProduct);
        }

        console.log("cartAllProducts", allCartProducts)
        return res.render("user/cart", { user, allCartProducts, cartItems })

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
                if (cart.items[existItemIndex].quantity + 1 > product.stock && product.stock === 0) {

                    return res.status(400).json({
                        success: false, message: "Out of stocks"
                    })
                }
                cart.items[existItemIndex].quantity += 1;
                product.stock -= 1

            } else {
                cart.items.push({
                    productId: new mongoose.Types.ObjectId(product._id),
                    quantity: 1,
                    stock: parseInt(product.stock)
                })
                product.stock -= 1
            }
            const saveCart = await cart.save()
            await product.save()
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
            product.stock -= 1
            await addCart.save()
            await product.save()
        }

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

        const updateInventory = await Product.updateOne(
            { _id: product._id },
            { $inc: { stock: stockCount.quantity } }
        )
        if (updateInventory) console.log(`Inventory updated ${product.name} ${stockCount}`)

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
            if (newQty > product.stock && product.stock === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Not enough quantity"
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
            product.stock -= 1
            await product.save()
            await cart.save()
            console.log("updated Stock :", product.stock)
        }
        if (minusQty) {
            if (newQty > product.stock && product.stock === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Not enough quantity"
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

            item.quantity -= 1
            product.stock += 1
            await product.save()
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

        console.log("usercart", userCart)
        console.log("Delivery cart address :", address)

        let checkoutTotal= 0
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

        req.session.orderDetails=checkoutTotal.toFixed(2)

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


export const confirmOrder = async(req,res,next)=>{
    try {
        const user = req.user
        const {paymentMethod} = req.body
         console.log("paymentMethod :",paymentMethod)

         const address = await Address.findOne({$or:[{isSelected:true},{isDefault:true}]})

         const totalAmount = req.session.orderDetails
    
         console.log("totalAmount : ",totalAmount)

         const orderID = `ORD-${Date.now()}`;
         console.log("orderID :",orderID)

         const cart = await Cart.findOne({userId:user.id})

         const newOrder = new Order({
            userId : user.id,
            orderId: orderID,
            addressId:address._id,
            payment:paymentMethod,
            items:cart.items.map(item=>({
                productId:item.productId,
                quantity:item.quantity
            })),
            totalAmount:totalAmount
         })

         const saveOrder = await newOrder.save()

         if(!saveOrder){
            return res.json({
                success:false,message:"Order failed"
            })
         }
         
         return res.status(200).json({
            success:true, message:"Order confirmed"
         })
    } catch (error) {
        next(new AppError(`Checkout Confirm order : ${error}`, 500))
    }
1}

export const orderConfirmed = async (req,res,next)=>{
    try {
        const userId = req.user
        const user = await User.findById(userId.id)
        const orders = await Order.findOne({userId:userId.id})
        // if(!req.session.order){
        //     return res.redirect('/read-and-grow/home')
        // }
        return res.render('user/orderConfirmed',{
                user,
                orders
            })
    } catch (error) {
        next(new AppError(`Order confimation falied : ${error}`,500))
    }
}
//============Logout=================== 
export const logout = async (req, res, next) => {
    try {
        res.clearCookie("jwt")
        req.session.user = null
        return res.json({ success: true, message: "Logged out successfully." })

    } catch (error) {
        next(new AppError(`Logout Failed : ${error}`, 500))
    }
}