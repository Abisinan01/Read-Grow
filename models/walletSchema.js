import mongoose, { Schema } from "mongoose";

const walletSchema = new Schema({
    userId: { type: mongoose.Types.ObjectId, ref: 'User'},
    transactions: [{
        orderId: { type: mongoose.Types.ObjectId, ref: "orders" },
        transactionId:{type:String},
        amount: { type: Number, required: true }, 
        transactionType: { type: String, enum: ['credit', 'debit', 'wallet'], required: true },
        source:{type:String},
        createdAt: { type: Date, default: Date.now },
        productId: { type: mongoose.Types.ObjectId}
    }],
    balance: { type: Number, min:0},
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;