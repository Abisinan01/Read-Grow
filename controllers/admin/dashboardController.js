import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import Coupon from "../../models/couponSchema.js";
import AppError from "../../utils/errorHandler.js"; // Assuming you have an error handler
import moment from "moment";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
// import createDateFilter from "../utils/dateFilter.js"; // Ensure correct utility function
// import createTable from "../utils/pdfTable.js"; 

export const adminDashboardGet = async (req, res, next) => {
    try {
        // Step 1: Get the most sold product
        let topProduct = await Order.aggregate([
            { $unwind: "$items" }, // Flatten items array
            {
                $group: {
                    _id: "$items.productId", // Group by productId
                    quantity: { $sum: "$items.quantity" }, // Total quantity sold
                    totalSales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } // Total sales revenue
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id", // _id contains productId
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $sort: { totalSales: -1 } } // Sort by total sales revenue (highest first)
        ]);
        
        
        const totalSales =topProduct.reduce((acc,curr)=>acc+curr.totalSales,0)
        console.log(totalSales)

        let countProducts = await Order.aggregate([
            { $unwind: "$items" }, // Flatten items array
            {
                $group: {
                    _id: "$items.productId", // Group by productId
                    quantity: { $sum: "$items.quantity" }, // Total quantity sold per product
                    totalSales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } // Total sales revenue per product
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id", // _id contains productId
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $sort: { totalSales: -1 } }, // Sort by total sales revenue (highest first)
            
            // **New stage to calculate total quantity of all sold products**
            {
                $group: {
                    _id: null,
                    totalSoldProducts: { $sum: "$quantity" } // Sum all product quantities
                }
            }
        ]);
        
        console.log(countProducts);
        

        let typeSales = await Order.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    quantity: { $sum: "$items.quantity" },
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.type",
                    totalQuantity: { $sum: "$quantity" },
                },
            },
            { $sort: { totalQuantity: -1 } },
        ]);

        const totalCoupons = await Coupon.find({isActive:true}).countDocuments()

        let orders = await Order.find()
        let deliveredOrdersCount = 0
        for(let order of orders){
            for(let item of order.items){
                deliveredOrdersCount += 1
            }
        }

        res.render("admin/dashboard", {
            topProduct,
            totalSales,
            typeSales,
            countProducts,
            totalCoupons,
            deliveredOrdersCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }  
};


export const getSalesData = async (req, res) => {
    const { filter } = req.query;
    console.log(filter)
    try {
        // Set the date range for the current filter
        let startDate, endDate;

        if (filter === "weekly") {
            endDate = moment().toDate();
            startDate = moment().subtract(6, 'days').toDate(); // Last 7 days
        } else if (filter === "monthly") {
            endDate = moment().toDate();
            startDate = moment().subtract(1, 'months').startOf('month').toDate(); // Last month
        } else if (filter === "yearly") {
            endDate = moment().toDate();
            startDate = moment().subtract(5, 'years').startOf('year').toDate(); // Last 5 years
        } else {
            endDate = moment().toDate();
            startDate = moment().startOf('day').toDate(); // Default to today
        }

        // Log the date range for debugging
        console.log(`Fetching orders from ${startDate} to ${endDate}`);

        // Fetch orders within the date range
        const orders = await Order.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            },
        }).sort({ createdAt: -1 }); // Sort in descending order

        // Log the fetched orders

        // Return the orders to the front end for filtering
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// PDF Report
export const downloadPDFReport = async (req, res) => {
    try {
        const { filter = "daily", startDate, endDate } = req.query;
        const dateFilter = createDateFilter(filter, startDate, endDate);
        const queryFilter = { ...dateFilter, orderStatus: "Delivered" };

        const orders = await Order.find(queryFilter).populate("items.product");
        const summary = await Order.aggregate([
            { $match: queryFilter },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" },
                    totalDiscount: { $sum: { $add: ["$discount", "$couponDiscount"] } },
                },
            },
        ]);

        const doc = new PDFDocument({ margin: 30 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=SwizzTimes_SalesReport.pdf");

        doc.pipe(res);

        // ✅ Title
        doc.fontSize(20).text("Swizz-Times Sales Report", { align: "center" }).moveDown();

        doc.fontSize(12)
            .text(`Filter: ${filter}`)
            .text(`Date Range: ${format(dateFilter.createdAt.$gte, "yyyy-MM-dd")} to ${format(dateFilter.createdAt.$lte, "yyyy-MM-dd")}`)
            .moveDown();

        // ✅ Table Data
        const tableData = orders.flatMap((order) =>
            order.items.map((item) => ({
                orderId: order.orderId ? order.orderId.slice(0, 12) : "N/A",
                date: format(order.createdAt, "yyyy-MM-dd"),
                product: item.product?.productName || "N/A",
                qty: item.quantity || 0,
                price: `₹${(item.price || 0).toFixed(2)}`,
                discount: `₹${(order.discount + order.couponDiscount).toFixed(2)}`,
                total: `₹${order.totalAmount.toFixed(2)}`,
            }))
        );

        if (tableData.length === 0) {
            doc.fontSize(12).text("No delivered orders found for the selected date range.", { align: "center" });
        } else {
            // ✅ Define Table Format
            await createTable(doc, {
                headers: ["Order ID", "Date", "Product", "Qty", "Price", "Discount", "Total"],
                rows: tableData.map(row => [
                    row.orderId,
                    row.date,
                    row.product,
                    row.qty,
                    row.price,
                    row.discount,
                    row.total
                ]),
            });
        }

        // ✅ Summary Section
        doc.moveDown().fontSize(12).text("Summary", { underline: true }).fontSize(11);
        const sum = summary[0] || {};
        doc.text(`Total Orders: ${sum.totalOrders || 0}`)
            .text(`Total Amount: ₹${(sum.totalAmount || 0).toFixed(2)}`)
            .text(`Total Discount: ₹${(sum.totalDiscount || 0).toFixed(2)}`);

        doc.end();
    } catch (error) {
        console.error("Error generating Swizz-Times PDF report:", error);
        res.redirect("/admin/pageerror");
    }
};

export const exportUser = async (req, res) => { 
    const workbook = new excelJS.Workbook();  // Create a new workbook
    const worksheet = workbook.addWorksheet("My Users"); // New Worksheet
    const path = "./files";  // Path to download excel
    // Column for data in excel. key must match data key
    worksheet.columns = [
      { header: "S no.", key: "s_no", width: 10 }, 
      { header: "First Name", key: "fname", width: 10 },
      { header: "Last Name", key: "lname", width: 10 },
      { header: "Email Id", key: "email", width: 10 },
      { header: "Gender", key: "gender", width: 10 },
  ];
  // Looping through User data
  let counter = 1;
  User.forEach((user) => {
    user.s_no = counter;
    worksheet.addRow(user); // Add data in worksheet
    counter++;
  });
  // Making first line in excel bold
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
  });
  try {
    const data = await workbook.xlsx.writeFile(`${path}/users.xlsx`)
     .then(() => {
       res.send({
         status: "success",
         message: "file successfully downloaded",
         path: `${path}/users.xlsx`,
        });
     });
  } catch (err) {
      res.send({
      status: "error",
      message: "Something went wrong",
    });
    }
  };