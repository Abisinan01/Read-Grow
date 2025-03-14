import mongoose, { Schema } from "mongoose"

const addressScehama = new Schema({
    userId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: {
        type: Number, required: true
    },
    addressType:{type:String,required:true},
    pincode: { type: String, required: true },
    state: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true }
}, { timestamps: true })

const Address = mongoose.model('address', addressScehama)
export default Address  