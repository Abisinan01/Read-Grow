import Order from "../../models/orderSchema.js"
import Wallet from "../../models/walletSchema.js"
import AppError from "../../utils/errorHandler.js"

export const transactionManagment = async (req, res, next) => {
    try {
        let { page, limit} = req.query 
        page = parseInt(page) || 1
        limit = parseInt(limit) || 10
        let skip = (page - 1) * limit

        const wallets = await Wallet.aggregate([
            { $unwind: "$transactions" },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: 'user'
                }
            },
            { $unwind: "$user" },
            { $sort: { "transactions.createdAt": -1 } },
            { $skip: skip },
            { $limit: limit },
            // {
            //     $project: {
            //         transactionId: "$transactions.transactionId",
            //         amount: "$transactions.amount",
            //         userName: "$user.username"
            //     }
            // }
        ]);
 

        const totalTransactions = await Wallet.aggregate([
            { $unwind: "$transactions" },
            { $count: "count" }
        ]);

        const count = totalTransactions[0]?.count || 0;
        const totalPages = Math.ceil(count / limit);

        res.render("admin/transactions", {
            wallets,
            page,
            totalPages,
            limit,
        });

    } catch (error) {
        next(new AppError(`Transaction managment failed :${error}`, 500))
    }
}



// export const viewTransaction = async (req,res,next)=>{
//     try {
//         const id = req.params.id
//         const wallets = await Wallet.aggregate([
//             { $unwind: "$transactions" },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "userId",
//                     foreignField: "_id",
//                     as: 'user'
//                 }
//             },
//             { $unwind: "$user"},
//         ]);

//         let transaction = []
//         for(let wallet of wallets){
//             if(wallet?.transactions?.transactionId === id){
//                 transaction.push(wallet)
//             }
//         }
 
//         const orderId = transaction[0].transactions?.orderId.toString();
//         const order = await Order.findOne({_id:transaction[0].transactions.orderId})

//         console.log(order)
        
//         return res.render('admin/transactionDetails',{transaction,order})  
//     } catch (error) {
//         console.log(error.message)
//         next(new AppError(error))
//     }
// }