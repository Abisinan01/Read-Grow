
import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    orderId: {
        type: String
        , required: true
    },
    addressId: {
        type: mongoose.Types.ObjectId,
        ref: "Address",
        required: true
    },
    status: {
        type: String,
        default: "Pending"
    },
    payment: {
        type: String,
        default: "COD"
    },
    items: [{
        productId: String,
        productName:String,
        quantity: Number,
        price: Number,
        isCancelled: { type: Boolean, default: false },
        isReturned: { type: Boolean, default: false },
        status: { type: String, default: "Pending" },
        reason: { type: String, default: null }
    }],
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String },
    reason: { type: String, default: null }

}, { timestamps: true })

const Order = mongoose.model('Order', orderSchema)
export default Order