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
        console.log("Product ID: ", id);

        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const date = new Date(product.createdAt).toDateString();
        res.render("user/product", { product, date, user: req.user });

    } catch (error) {
        return next(new AppError(`Product details page : ${error}`, 500))
    }
};


//==================shoping page =====================
export const renderShopPage = async (req, res, next) => {
    try {
        let { search, category, page, limit, price } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 6;
        let skip = (page - 1) * limit;

        let query = { isBlocked: { $ne: true } };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { authorName: { $regex: search, $options: "i" } }
            ];
        }

        if (category) {
            query.category = category;
        }

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
            .limit(limit);

        const categories = await Category.find({ status: { $ne: "inactive" } });
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const responseData = {
            success: true,
            allProducts: products,
            totalProducts,
            totalPages,
            page,
            limit,
            search: search || "",
            category: category || "",
            categories,
            errorMessage: products.length === 0 ? "No products found." : null,
            user: req.user
        };

        // Check if it's an AJAX request
        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(200).json(responseData);
        }

        // Render the page for non-AJAX requests
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
        req.session.update=user.email
        if(req.session.update){
            return res.render("user/editEmail",{id})
        }else{
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
            success:true,
            message:"Please check your email"
        })

    } catch (error) {
        next(new AppError(`change email request failed : ${error}`, 500))
    }
}


export const renderUpdateMail = async (req,res,next)=>{
    try {
    if(req.session.update){
        return res.render("user/updateNewMail",{user:req.user})
    }
    return res.status(404).redirect('/read-and-grow/notFound')
    } catch (error) {
        next (new AppError(`Update Mail failed : ${error}`,500))
    }
}

export const updateNewMail = async (req,res,next)=>{
    try {
        const {email} = req.body
        console.log(email)
        
        const isExists = await User.findOne({email:email})
        if(isExists){
            return res.status(400).json({
                success:false,
                message:"This email is alreeady in use. Please choose another."
            })
        }

        const otpResult = await sendOTP(email)
        console.log("Send Otp response  :", otpResult)

        if (!otpResult.success) {
            return res.status(500).json(otpResult.message)
        }
 
        req.session.updateNew=email
        return res.status(200).json({
            success:true,
            message:otpResult.message,
            redirect:"/otp/verify"
        })
        
    } catch (error) {
        next(new AppError(`updateNew Mail : ${id}`))
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