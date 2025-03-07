import otpGenerator from "otp-generator"
import OTP from '../models/otpSchema.js';
import User from '../models/userSchema.js';
import jwt from "jsonwebtoken"

    export const sendOTP = async (email) => {
        try {
            const checkUserPresent = await User.findOne({ email });

            if (checkUserPresent) {
                return {
                    success: false,
                    message: "User already exists"
                }
            }

            let otp = otpGenerator.generate(4, {
                lowerCaseAlphabets: false,
                upperCaseAlphabets: false,
                specialChars: false
            })

            let result = await OTP.findOne({ otp: otp })

            while (result) {
                otp = otpGenerator.generate(4, {
                    upperCaseAlphabets: false
                })
                result = await OTP.findOne({ otp: otp })
            }

            const otpPayload = { email, otp }
            //for store otp in db
            await OTP.create(otpPayload)


            return {
                success: true,
                message: "OTP sent successfully",
                // redirect : we need to define next process
            }



        } catch (error) {

            console.log(error.message)
            return {
                success: false,
                message: "failed to send OTP",
                error: error.message
            }
        }
    }


export const otpVerifyGet = async (req, res, next) => {
    try {
        if (req.session.temp) {
            return res.render("user/otp")
        }
        res.redirect("/read-and-grow/login")
    } catch (error) {
        console.log(error.message)
    }
}

//==========================verifyotp Post method====================================
export const otpVerifyPost = async (req, res, next) => {
    try {
        const { otp } = req.body
        console.log("otp : ", otp)

        if (!req.session.temp) {
            return res.status(400).json({
                success: false,
                message: "Session expired "
            })
        }

        const { username, email, phoneNumber, password } = req.session.temp
        // console.log("temp session otp", req.session.temp)

        const getOtp = await OTP.find({ email: email }).sort({ createdAt: -1 }).limit(1)
        // console.log(getOtp)

        if (!getOtp.length) {

            return res.status(400).json({
                success: false,
                message: "Otp is not valid"
            })
        }

        const expire = Date.now() + 60 * 5
        if (getOtp[0].createdAt > expire) {
            return res.status(400).json({
                success: false,
                message: "OTP is expired. Please create new"
            })
        }

        const newUser = new User({
            username,
            email,
            phoneNumber: Number(phoneNumber),
            password,
            role: 'user',
            isEmailVerfied: true
        })
        await newUser.save()
        console.log("user saved :", newUser.username);

        req.session.temp = null;

        //creating JWT
        const token = jwt.sign({ id: newUser._id, username: newUser.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES })
        //Store JWT in cookies
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })

        return res.status(200).json({
            success: true,
            message: "Account created successfully",
            redirect: "/read-and-grow/home"
        })

    } catch (error) {
        console.log(error.message)
    }
}

