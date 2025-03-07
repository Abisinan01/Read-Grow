
import mongoose, { Schema } from "mongoose"

const categorySchema = new Schema({
    categoryName:{
        type:String,
        required:true,
        trim:true,
    },
    description:{
        type:String
    },
    status:{    
        type:String,
        default:"Active"
    }  
},{timestamps:true})

const Category= mongoose.model('category',categorySchema)
export default Category