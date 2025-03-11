import express from "express"
import { 
    sendOTP,
    otpVerifyGet,
    otpVerifyPost

 } from "../controllers/otpController.js"
import { renderEmailVerify } from "../controllers/userController.js"
import  jwt  from "jsonwebtoken"

const router = express.Router()
 
router.get("/otp-verify", otpVerifyGet)
router.post('/otp-verify',otpVerifyPost)

router.post("/send-otp", async (req, res) => {
    try {
        const { token } = req.body; 
        // console.log(1,token)

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is missing",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.email) {
            return res.status(400).json({
                success: false,
                message: "Token not contain email",
            });
        }

        const result = await sendOTP(decoded.email);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Error in send-otp route:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to send OTP",
            error: error.message,
        });
    }
});
//export
export default router