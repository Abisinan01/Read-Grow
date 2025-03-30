import mongoose, { Schema } from "mongoose";

const couponSchema = new Schema({
    couponCode:{type:String},
    discountValue:{type:Number},
    minPurchase:{type:Number},
    maxDiscount:{type:Number},
    expiryDate:{type:Date},
    isActive:{type:Boolean},
    isUsed: [{ type: mongoose.Types.ObjectId, ref: "User"}]

},{timestamps:true})

couponSchema.index({createdAt:1},{expireAfterSeconds:36000*24})

const Coupon = mongoose.model('Coupon',couponSchema)
export default Coupon