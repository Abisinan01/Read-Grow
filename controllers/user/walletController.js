import mongoose from "mongoose";
import AppError from "../../utils/errorHandler.js";
import Wallet from "../../models/walletSchema.js";

export const renderWallet = async (req,res,next)=>{
    try {
        const user = req.user
        const wallet = await Wallet.findOne({userId:user.id})
            .populate('userId')
            .sort({createdAt:-1})
            console.log(wallet)
        res.render("user/wallet",{user,wallet})
    } catch (error) {
        next(new AppError(`user Wallet : ${error}`,500))
    }
}