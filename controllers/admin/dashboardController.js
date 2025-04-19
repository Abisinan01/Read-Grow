import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import AppError from "../../utils/errorHandler.js"; // Assuming you have an error handler
import moment from "moment";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
// import createDateFilter from "../utils/dateFilter.js"; // Ensure correct utility function
// import createTable from "../utils/pdfTable.js"; 
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const adminDashboardGet = async (req, res, next) => {
    try {
        res.render("admin/dashboard")
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};


export const updateDashboard = async (req, res, next) => {
    try {
        const { filter, startDate, endDate } = req.query;

        const dateFilter = buildDateFilter(filter, startDate, endDate);

        const topProduct = await getTopProducts(dateFilter);
        const totalSales = await getTotalSales(dateFilter);
        const countProducts = await getTotalProductsSold(dateFilter);
        const totalCoupons = await getActiveCouponsCount(); // Coupons not time-bound
        const deliveredOrdersCount = await getDeliveredOrdersCount(dateFilter);
        const dailySales = await getDailySales(dateFilter);
        const categoryBasedSales = await getCategoryBasedSales(dateFilter);
        const topSellingBooks = await getTopSelledItems(dateFilter)
        // Response

        return res.json({
            dailySales,
            categoryBasedSales,
            topProduct,
            totalSales,
            countProducts,
            totalCoupons,
            deliveredOrdersCount,
            topSellingBooks
        });
    } catch (error) {
        console.error(`Update graph failed: ${error.message}`);
        return res.status(500).json({ message: 'Update graph failed' });
    }
};

// Helper Functions
const buildDateFilter = (filter, startDate, endDate) => {
    const now = new Date();
    let start;

    switch (filter) {
        case 'daily':
            start = new Date(now.setHours(0, 0, 0, 0));
            return { createdAt: { $gte: start } };

        case 'weekly':
            start = new Date(now.setDate(now.getDate() - now.getDay()));
            start.setHours(0, 0, 0, 0);
            return { createdAt: { $gte: start } };

        case 'monthly':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { createdAt: { $gte: start } };

        case 'yearly':
            start = new Date(now.getFullYear(), 0, 1);
            return { createdAt: { $gte: start } };

        case 'custom':
            if (!startDate || !endDate) throw new Error('Start and end dates are required for custom filter');
            return {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

        default:
            return {};
    }
};

const getTopProducts = async (dateFilter) => {
    return Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$items" },
        { $match: { "items.status": "Delivered" } },
        {
            $group: {
                _id: "$items.productId",
                quantity: { $sum: "$items.quantity" },
                totalSales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $sort: { totalSales: -1 } }
    ]);
};

const getTotalSales = async (dateFilter) => {
    return Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$items" },
        { $match: { "items.status": "Delivered" } },
        { $group: { _id: null, totalSum: { $sum: "$items.price" } } }
    ]);
};

const getTotalProductsSold = async (dateFilter) => {
    return Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$items" },
        { $match: { "items.status": "Delivered" } },
        {
            $group: {
                _id: "$items.productId",
                quantity: { $sum: "$items.quantity" },
                totalSales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $sort: { totalSales: -1 } },
        {
            $group: {
                _id: null,
                totalSoldProducts: { $sum: "$quantity" }
            }
        }
    ]);
};

const getActiveCouponsCount = async () => {
    return Coupon.countDocuments({ isActive: true });
};

const getDeliveredOrdersCount = async (dateFilter) => {
    return Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$items" },
        { $match: { "items.status": "Delivered" } },
        { $group: { _id: null, count: { $sum: 1 } } }
    ]).then(result => result[0]?.count || 0);
};

const getDailySales = async (dateFilter) => {
    return Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$items" },
        { $match: { "items.status": "Delivered" } },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                    }
                },
                totalSales: { $sum: "$items.price" }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

const getCategoryBasedSales = async (dateFilter) => {
    const allOrders = await Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$items" },
        { $match: { "items.status": "Delivered" } }
    ]);
    const products = await Product.find();
    const categoryBasedSales = {};

    for (const product of products) {
        for (const order of allOrders) {
            if (order.items.productId.toString() === product._id.toString()) {
                categoryBasedSales[product.category] = (categoryBasedSales[product.category] || 0) + 1;
            }
        }
    }
    return categoryBasedSales;
};

const getTopSelledItems = async (dataFilter) => {
    const allOrders = await Order.aggregate([
        {$match:dataFilter},
        {$unwind:"$items"},
        {$group:{_id:"$items.productId",totalQty:{$sum:"$items.quantity"}}},
        {$sort:{"totalQty":-1}},
        {$limit:3},
    ])

    const topProducts = []
    for(let order of allOrders){
        const products = await Product.findById(order._id)
        topProducts.push(products)
    }

    return topProducts
}



 



 