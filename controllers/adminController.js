import express from "express";
import User from "../models/userSchema.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { render } from "ejs";
import Category from "../models/categorySchema.js";
import fs from "fs"
import { mkdir, unlink } from 'fs/promises';
import path from "path";
import sharp from 'sharp';
import AppError from "../utils/errorHandler.js";
import Product from "../models/productSchema.js";
import { promises } from 'fs';
import { setTimeout } from 'timers/promises';


//=====================admin login get ==================
export const adminLoginGet = async (req, res) => {
    try {
        if (req.cookies.jwt) {
            return res.redirect('/admin/dashboard')
        }
        return res.render("admin/login")

    } catch (error) {
        console.error(`admin_login failed : ${error.message}`)
    }
}

//=======================login admin post
export const adminLoginPost = async (req, res, next) => {

    //======Creating admin and store Database==========
    // let {username,password} = req.body
    // username = username.trim()
    // const salt = await bcrypt.genSalt(10)
    // const hashPassword = await bcrypt.hash(password,salt)
    // const newAdmin = new User({
    //     username : username,
    //     password : hashPassword,
    //     role : "admin"
    // })
    // await newAdmin.save()
    //======================================
    try {
        let { username, password } = req.body

        const admin = await User.findOne({ username })


        if (!admin) {
            return res.status(400).json({ success: false, message: "Please enter valid admin details" })
        }

        const comparePassword = await bcrypt.compare(password, admin.password)
        if (!comparePassword) {
            return res.status(400).json({ success: false, message: "Incorrect password" })
        }

        //create jwt token
        const token = jwt.sign({ id: admin._id, name: admin.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES })

        //store jwt to cookies
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })

        return res.status(200).json({ success: true, message: "Logged successfully", redirect: "/admin/dashboard" })


    } catch (error) {
        return next(new AppError(`admin Login ${req.method} method failed `, 500))
    }
}

//================admin Get method=======================
export const adminDashboardGet = async (req, res, next) => {
    try {
        return res.render("admin/dashboard")
    } catch (error) {
        return next(new AppError(`admin dashboard ${req.method} method failed `, 500))
    }
}

//=================admin_users_get=========================
export const adminUserGet = async (req, res, next) => {
    try {

        let { page, limit } = req.query
        page = parseInt(page) || 1
        limit = parseInt(limit) || 5
        let skip = (page - 1) * limit

        const allUsers = await User.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const totalUsers = await User.find().countDocuments()
        const totalPages = Math.ceil(totalUsers / limit)

        return res.render("admin/users", {
            totalUsers,
            allUsers,
            totalPages,
            limit, page
        })

    } catch (error) {
        return next(new AppError(`admin Users ${req.method} method failed `, 500))
    }
}

//==================User searching================================

export const searchUser = async (req, res, next) => {
    try {
        const { q } = req.query;
        // console.log(q);

        if (q?.length === 0 || !q) {
            const users = await User.find()
            if (!users) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                })
            }
            return res.status(200).json({
                success: true,
                users
            })
        } else {

            const users = await User.find({
                $and: [
                    { role: "user" },
                    {
                        $or: [
                            { username: { $regex: q, $options: 'i' } },
                            { email: { $regex: q, $options: 'i' } }
                        ]
                    }
                ]
            })
            if (!users || users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                })
            }

            return res.status(200).json({
                success: true,
                users
            })
        }

    } catch (error) {
        return next(new AppError(`admin search user failed : ${error} `, 500))
    }
}

//==============Block user========================================

export const blockUser = async (req, res, next) => {
    try {
        const id = req.params.id
        console.log(id)
        const user = await User.findOne({ _id: id })

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "user blocking failed"
            })
        }

        const newStatus = !user.isBlocked

        await User.updateOne({ _id: id }, { $set: { isBlocked: newStatus } })
        return res.status(200).redirect("/admin/users")

    } catch (error) {
        console.log('User blocking error : ', error.message)
        return next(new AppError(`admin block user failed `, 500))
    }
}

//====================category=======================

export const categoryManagment = async (req, res, next) => {

    // if(!req.session.admin){
    //     return res.redirect('/admin/login')
    // }

    let { page, limit } = req.query
    page = parseInt(page) || 1
    limit = parseInt(limit) || 5
    let skip = (page - 1) * limit
    try {
        const categories = await Category.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const total = await Category.find().countDocuments()
        const totalPages = Math.ceil(total / limit)

        const products = await Product.aggregate([{$group:{_id:"$category", count:{$sum:1}}}])
        // console.log("category count :",products)
        return res.render('admin/category', {
            categories,
            limit,
            page,
            totalPages,
            // flag: true,
            products
        })
    } catch (error) {

        return next(new AppError(`Category get failed `, 500))
    }
}



//===================Add category====================
export const addCategoryGet = async (req, res, next) => {
    try {
        return res.render('admin/categoryAdd')
    } catch (error) {
        console.log(`add category getting failed ${error.message}`)
        return next(new AppError(`admin category add ${req.method} method failed `, 500))
    }
}

//====POST

export const addCategory = async (req, res, next) => {
    try {
        const { categoryId, categoryName, categoryDescription, status } = req.body
        console.log("addCategroy", req.body)
        
        const existCategory = await Category.findOne({categoryName})
        console.log(existCategory)
        if(existCategory){
            return res.status(400).json({
                success:false,
                message:"category already exists"
            })
        }
        const newCatogory = new Category({
            categoryId: categoryId,
            categoryName: categoryName,
            description: categoryDescription,
            status: status
        })

        
        await newCatogory.save()

        return res.status(201).json({
            success: true,
            message: "Category created",
            redirect: "/admin/category"
        })
    } catch (error) {
        console.log("Category add failed : ", error.message)
        return next(new AppError(`admin addCategory ${req.method} method failed `, 500))
    }
}



export const deleteCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.id
        // console.log(categoryId)
        const deleteCategory = await Category.findByIdAndDelete(categoryId)
        // console.log(deleteCategory)
        if (!deleteCategory) {
            return res.status(400).json({
                success: false,
                message: "Category deleting failed"
            })
        }
        return res.status(200).json({
            success: true,
            message: "Category deleted"
        })
    } catch (error) {
        console.log("Category delete failed", error.message)
        return next(new AppError(`Category delete failed  ${req.method} method failed `, 500))
    }
}

//==========================edit category=========================

export const editCategory = async (req, res, next) => {
    try {
        const id = req.params.id
        console.log("editCategory get :", id)

        const findCategory = await Category.findById(id)
        return res.render('admin/categoryEdit', {
            findCategory
        })

    } catch (error) {
        console.log(`Category edit failed : ${error.message}`)
    }
}

//=====Patch      
export const editCategoryPatch = async (req, res, next) => {
    try {
        const { categoryId, categoryName, categoryDescription, status } = req.body
        console.log("editCategory Patch :", categoryDescription)

        const updatedCategory = await Category.findOneAndUpdate(
            { _id:categoryId },
            {
                $set: {
                    categoryName,
                    description: categoryDescription,
                    status,
                },
            })

        return res.status(200).json({
            success: true,
            message: "Category updated"
        })


    } catch (error) {
        console.log(`Category edit failed : ${error.message}`)
        return next(new AppError(`editCategory failed ${error}`, 500))
    }
}

//==search category
export const searchCategory = async (req,res,next) =>{
    try {
        const { q } = req.query 
        // console.log("category",q)

        if (q?.length === 0 || !q) {
            const category = await Category.find()
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Product is not found"
                })
            }
            return res.status(200).json({
                success: true,
                category
            })
        } else {

            const category = await Category.find({
                categoryName: { $regex: q, $options: "i" }
            })
            console.log(category)
            if (!category || category.length === 0) {
                console.log(1)
                return res.status(404).json({
                    success: false,
                    message: "Product is not found"
                })
            }
            return res.status(200).json({
                success: true,
                category
            })
        }


    } catch (error) {
        next(new AppError(`Category searching failed ${error}`, 500))
    }
}

//==========================Product Managment part=======================
export const productManagment = async (req, res, next) => {
    try {
        let { page, limit } = req.query
        page = parseInt(page) || 1
        limit = parseInt(limit) || 5
        let skip = (page - 1) * limit

        const allProducts = await Product.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const totalProducts = await Product.find().countDocuments()
        const totalPages = Math.ceil(totalProducts / limit)

        res.render('admin/product', {
            allProducts,
            totalProducts,
            totalPages,
            limit,
            page
        })
    } catch (error) {
        console.log(`product management get method failed ${error.message}`)
        next(new AppError(`products page loging failed ${error}`, 500))
    }
}


export const addProducts = async (req, res, next) => {
    try {
        res.render("admin/addProducts")
    } catch (error) {
        console.log("Product adding failed ", error.message)

    }
}

//=========product uploading
export const addProductsPost = async (req, res, next) => {
    try {
        console.log("body", req.body)
        console.log("files", req.files)
        const {
            name,  
            description,
            author,
            price,
            stock,
            category,
            productId
        } = req.body

        const basePath = `${req.protocol}://${req.get("host")}/temp/uploads`;// this for getting image file path
        const files = req.files
        let imagesPaths = []

        if (files && files.length > 0) {
            imagesPaths = files.map(file => `${basePath}/${path.basename(file.path)}`);
        } else {
            return res.status(400).json({ success: false, message: "At least one image is required." });
        }

        let newProduct = new Product({
            name: name,
            description: description,
            authorName: author,
            price: parseFloat(price),
            stock: parseInt(stock),
            category: category,
            productId,
            images: imagesPaths
        })
        // console.log(newProduct)
        await newProduct.save();
        return res.json({
            success: true,
            message: "Product added successfully",
            newProduct,
            redirect: "/admin/products"
        });

    } catch (error) {
        return next(new AppError(`Product adding failed ${error}`, 500));
    }
};

//===edit product
export const editProductsGet = async (req, res, next) => {
    try {
        const id = req.params.id
        console.log('edit product :', id)

        const product = await Product.findById(req.params.id);
        // console.log("Product:", product);

        return res.render('admin/editProduct', { product })

    } catch (error) {
        return next(new AppError(`Product editing page loadng failed ${error}`, 500))
    }
}

export const editProduct = async (req, res, next) => {
    try {
        // console.log("body", req.body)
        // console.log("files",req.files)
        const id = req.params.id
        console.log('productId',id)

        const {
            name,
            description,
            author,
            price,
            stock,
            category
        } = req.body

        const basePath = `${req.protocol}://${req.get("host")}/temp/uploads`;// this for getting image file path
        const files = req.files

        let existProduct = await Product.findById(id)
        let imagesPaths = existProduct.images

        if (files && files.length > 0) {
            imagesPaths = files.map(file => `${basePath}/${path.basename(file.path)}`);
        }

        // console.log(imagesPaths,"images path") 
         await Product.findOneAndUpdate(
            { _id : id },
            {
                $set: {
                    name: name,
                    description: description,
                    authorName: author,
                    price: parseFloat(price),
                    stock: parseInt(stock),
                    category: category,
                    images: imagesPaths
                }
            }
        )

        return res.json({
            success: true,
            message: "Product updated successfully",
            redirect: "/admin/products"
        });

    } catch (error) {
        return next(new AppError(`Product editing failed ${error}`, 500))
    }
}

//==========delete Product========
export const deleteProduct = async (req, res, next) => {
    try {
        const productId = req.params.id
        console.log(productId)
        const deletePro = await Product.findByIdAndDelete(productId)
        if (!deletePro) {
            return res.json({
                success: false,
                message: "Product deleted failed"
            })
        }
        return res.json({
            success: true,
            message: "Product deleted"
        })

    } catch (error) {
        next(AppError(`Product deleting failed ${error}`, 500))
    }
}

//======block procuct
export const blockProduct = async (req, res, next) => {
    try {
        const productId = req.params.id
        console.log(productId)

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(400).json({
                success: false,
                message: "Block product failed"
            })
        }

        const newStatus = !product.isBlocked
        console.log(newStatus)
        await Product.updateOne({ _id: productId }, { $set: { isBlocked: newStatus } })

        return res.status(200).json({
            success: true,
            message: "Product blocked"
        })

    } catch (error) {
        next(new AppError(`Block product failed ${error}`, 500))
    }
}

//====search Product
export const searchProduct = async (req, res, next) => {
    try {
        const { q } = req.query
        console.log(q)

        if (q?.length === 0 || !q) {
            const products = await Product.find()
            if (!products) {
                return res.status(404).json({
                    success: false,
                    message: "Product is not found"
                })
            }
            return res.status(200).json({
                success: true,
                products
            })
        } else {

            const products = await Product.find({
                name: { $regex: q, $options: "i" }
            })
            console.log(products)
            if (!products || products.length === 0) {
                console.log(1)
                return res.status(404).json({
                    success: false,
                    message: "Product is not found"
                })
            }
            return res.status(200).json({
                success: true,
                products
            })
        }


    } catch (error) {
        next(new AppError(`producting searching failed ${error}`, 500))
    }
}




//===================Logout button================================
export const adminLogout = async (req, res, next) => {
    try {
        res.clearCookie('jwt')
        res.json({ success: true, message: "Logged out successfully." })
    } catch (error) {
        console.log('admin Logout failed : ', error.message)
        res.status(500).json({ success: false, message: "something went wrong" })
    }

}


