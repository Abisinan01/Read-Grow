import mongoose, { Schema } from "mongoose";

const offerSchema = new Schema({
    offerName: {
        type: String,
        required: true 
    },
    offerType: {
        type: String,
        required: true,
        enum: ['Product', 'Category']  
    },
    productId: {
        type: mongoose.Types.ObjectId,
        ref: 'Product',
    },
    categoryId: {
        type: mongoose.Types.ObjectId,
        ref: 'Category',
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    validFrom: {
        type: Date,
        required: true
    },
    validTo: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });
const Offer = mongoose.model('Offer', offerSchema);
export default Offer;