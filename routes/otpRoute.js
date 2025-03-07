import express from "express"
import { 
    sendOTP,
    otpVerifyGet,
    otpVerifyPost

 } from "../controllers/otpController.js"
import { emailVerify } from "../controllers/userController.js"
 
const router = express.Router()
 
router.get("/otp-verify", otpVerifyGet)
router.post('/otp-verify',otpVerifyPost)

router.post('/send-otp',sendOTP)

//export
export default router