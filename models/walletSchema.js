import mongoose, { Schema } from "mongoose";

const walletSchema = new Schema({
    userId: { type: mongoose.Types.ObjectId, ref: 'users', required: true },
    transactions: [{
        orderId: { type: mongoose.Types.ObjectId, ref: "orders" },
        amount: { type: Number, required: true }, 
        transactionType: { type: String, enum: ['credit', 'debit', 'wallet'], required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    balance: { type: Number},
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;