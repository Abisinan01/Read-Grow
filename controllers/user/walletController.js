import mongoose from "mongoose";
import AppError from "../../utils/errorHandler.js";
import Wallet from "../../models/walletSchema.js";

export const renderWallet = async (req, res, next) => {
    try {
        let { page, limit } = req.query
        page = parseInt(page) || 1
        limit = parseInt(limit) || 6
        let skip = (page - 1) * limit

        const user = req.user
        // const wallet = await Wallet.findOne({userId:user.id})
        //     .populate('userId')
        const wallet = await Wallet.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(user.id) } },
            { $unwind: "$transactions" },
            { $sort: { "transactions.createdAt": -1 } },
            { $skip: skip },
            { $limit: limit }
        ])

        const totalCountResult = await Wallet.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(user.id) } },
            { $unwind: "$transactions" },
            { $count: "total" }
        ]);
        const totalTransactions = totalCountResult[0]?.total || 0;
        const totalPages = Math.ceil(totalTransactions / limit)

        console.log(wallet)

        res.render("user/wallet", {
            user,
            wallet,
            totalPages, page, limit
        })
    } catch (error) {
        next(new AppError(`user Wallet : ${error}`, 500))
    }
}