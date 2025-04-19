import moment from "moment"
import Order from "../../models/orderSchema.js"
// import pdf from "html-pdf"
import pdf from 'pdf-creator-node'
import ExcelJS from "exceljs"
export const salesReport = async (req, res) => {

    let { filter, startDate, endDate, page, limit } = req.query
    let start, end

    //FILTER DATES
    if (startDate && endDate) {
        start = moment(startDate).startOf('day')
        end = moment(endDate).endOf('day')
    } else if (filter === 'weekly') {
        start = moment().startOf('isoWeek')
        end = moment().endOf('isoWeek')
    } else if (filter === 'monthly') {
        start = moment().startOf('month')
        end = moment().endOf('month')
    } else if (filter === 'yearly') {
        start = moment().startOf('year')
        end = moment().endOf('year')
    } else {
        start = moment().startOf('day')
        end = moment().endOf('day')
    }

    // PAGINATION
    page = parseInt(page) || 1
    limit = parseInt(limit) || 10
    let skip = (page - 1) * limit

    try {
        const orders = await Order.find({
            createdAt: {
                $gte: start.toDate(),
                $lt: end.toDate()
            }
        }).populate('userId')
            .skip(skip)
            .limit(limit)

        console.log(orders)

        let totalOrders = await Order.find({ createdAt: { $gte: start.toDate(), $lt: end.toDate() } }).countDocuments()
        let totalPages = Math.ceil(totalOrders / limit)//ROUND TO INTEGER

        let salesCount = 0;
        let totalAmount = 0;
        let discountedAmount = 0;

        orders.forEach(order => {
            salesCount += order.items.reduce((acc, item) => acc + item.quantity, 0); // total items sold
            totalAmount += parseFloat(order.totalAmount);
            discountedAmount += parseFloat(order.totalAmount) - parseFloat(order.discount);
        });
        return res.render('admin/salesReport', {
            orders, salesCount,
            totalAmount: Number(totalAmount),
            discountedAmount: Number(discountedAmount),
            totalPages, totalOrders, page, limit
        })

    } catch (error) {
        console.log(`Sale report error : ${error.message}`)
        return res.status(500).json({ message: 'Sales report failure' })
    }
}


// export const downloadPDFReport = async (req, res) => {
//     try {
//         const { filter, startDate, endDate } = req.query
//         let start, end

//         if (startDate && endDate) {
//             start = moment(startDate).startOf('day')
//             end = moment(endDate).endOf('day')
//         } else if (filter === 'weekly') {
//             start = moment().startOf('isoWeek')
//             end = moment().endOf('isoWeek')
//         } else if (filter === 'monthly') {
//             start = moment().startOf('month')
//             end = moment().endOf('month')
//         } else if (filter === 'yearly') {
//             start = moment().startOf('year')
//             end = moment().endOf('year')
//         } else {
//             start = moment().startOf('day')
//             end = moment().endOf('day')
//         }

//         const orders = await Order.find({
//             createdAt: {
//                 $gte: start.toDate(),
//                 $lt: end.toDate()
//             }
//         }).populate('userId')


//         let salesCount = 0;
//         let totalAmount = 0;
//         let discountedAmount = 0;

//         orders.forEach(order => {
//             salesCount += order.items.reduce((acc, item) => acc + item.quantity, 0); // TOTAL ITEMS SOLD
//             totalAmount += parseFloat(order.totalAmount || 0);//TOTAL AMOUNT
//             discountedAmount += parseFloat(order.totalAmount || 0) - parseFloat(order.discount || 0);//TOTAL DISCOUNT

//         });

//         //RENDER PDF PAGE
//         return res.render('admin/report-pdf', {
//             orders, salesCount,
//             totalAmount: Number(totalAmount),
//             discountedAmount: Number(discountedAmount)
//         }, (err, html) => {
//             if (err) {
//                 console.log(err.message)
//                 return res.status(500).send("Error rendering PDF");
//             }
//             pdf.create(html).toStream((err, stream) => {
//                 if (err) {
//                     console.log(err.message)
//                     return res.status(500).send("Error rendering PDF");
//                 }
//                 res.setHeader('Content-Type', 'application/pdf');
//                 res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
//                 stream.pipe(res);
//             });
//         });


//     } catch (error) {
//         console.log(`Pdf report download failed ${error.message}`)
//         res.status(500).send("Pdf report generating failed")
//     }
// }


//USING pdf creater node
 
export const downloadPDFReport = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let start, end;

        // Date range logic (unchanged)
        if (startDate && endDate) {
            start = moment(startDate).startOf('day');
            end = moment(endDate).endOf('day');
        } else if (filter === 'weekly') {
            start = moment().startOf('isoWeek');
            end = moment().endOf('isoWeek');
        } else if (filter === 'monthly') {
            start = moment().startOf('month');
            end = moment().endOf('month');
        } else if (filter === 'yearly') {
            start = moment().startOf('year');
            end = moment().endOf('year');
        } else {
            start = moment().startOf('day');
            end = moment().endOf('day');
        }

        // Fetch orders (unchanged)
        const orders = await Order.find({
            createdAt: {
                $gte: start.toDate(),
                $lt: end.toDate()
            }
        }).populate('userId');

        // Calculate sales metrics (unchanged)
        let salesCount = 0;
        let totalAmount = 0;
        let discountedAmount = 0;

        orders.forEach(order => {
            salesCount += order.items.reduce((acc, item) => acc + item.quantity, 0);
            totalAmount += parseFloat(order.totalAmount || 0);
            discountedAmount += parseFloat(order.totalAmount || 0) - parseFloat(order.discount || 0);
        });

        // Render EJS template to HTML
        res.render('admin/report-pdf', {
            orders,
            salesCount,
            totalAmount: Number(totalAmount),
            discountedAmount: Number(discountedAmount)
        }, async (err, html) => {
            if (err) {
                console.error(`Error rendering EJS: ${err.message}`);
                return res.status(500).send('Error rendering PDF');
            }

            // Configure pdf-creator-node options
            const options = {
                format: 'A4',
                orientation: 'portrait',
                border: '10mm',
                header: {
                    height: '10mm',
                    contents: '<div style="text-align: center;">Sales Report</div>'
                },
                footer: {
                    height: '10mm',
                    contents: {
                        default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>'
                    }
                }
            };

            // Document object for pdf-creator-node
            const document = {
                html: html,
                data: {}, // No dynamic data needed since EJS already rendered the HTML
                type: 'buffer' // Return a buffer instead of a file
            };

            try {
                // Generate PDF buffer
                const pdfBuffer = await pdf.create(document, options);

                // Set response headers for PDF download
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');

                // Send the PDF buffer to the client
                res.send(pdfBuffer);
            } catch (pdfError) {
                console.error(`Error generating PDF: ${pdfError.message}`);
                console.log("pdf error: ",pdfError)
                res.status(500).send('Error generating PDF');
            }
        });

    } catch (error) {
        console.error(`PDF report download failed: ${error.message}`);
        res.status(500).send('PDF report generation failed');
    }
};



export const downloadExcelReport = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let start, end;

        // Set the date ranges based on the filter or custom date range
        if (startDate && endDate) {
            start = moment(startDate).startOf('day');
            end = moment(endDate).endOf('day');
        } else if (filter == 'weekly') {
            start = moment().startOf('isoWeek');
            end = moment().endOf('isoWeek');
        } else if (filter == 'monthly') {
            start = moment().startOf('month');
            end = moment().endOf('month');
        } else if (filter == 'yearly') {
            start = moment().startOf('year');
            end = moment().endOf('year');
        } else {
            start = moment().startOf('day');
            end = moment().endOf('day');
        }

        
        const orders = await Order.find({
            createdAt: {
                $gte: start.toDate(),
                $lte: end.toDate()
            }
        }).populate('userId')
 
        let salesCount = 0;
        let totalAmount = 0;
        let discountedAmount = 0;

        orders.forEach(order => {
            salesCount += order.items.reduce((acc, item) => acc + item.quantity, 0); //tTOTAL ITEMS SOLD
            totalAmount += parseFloat(order.totalAmount);//TOTAL AMOUNT
            discountedAmount += parseFloat(order.totalAmount) - parseFloat(order.discount);//DISCOUNT PRICE
        });


        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        //SETTING ROWS
        worksheet.addRow(['Sales Report']);
        worksheet.addRow([]); // Empty row for spacing
        worksheet.addRow(['Sales Count:', salesCount]);
        worksheet.addRow(['Total Amount:', totalAmount]);
        worksheet.addRow(['Total Discount:', discountedAmount]);
        worksheet.addRow([]); // Empty row for spacing

        // Add the header row for the table
        worksheet.addRow(['Date', 'Order ID', 'Customer', 'Status', 'Payment Method', 'Quantity', 'Total']);

        // Add data rows
        orders.forEach(order => {
            let itemQty = 0
            order.items.forEach(item => {
                itemQty += item.quantity
            });
                worksheet.addRow([
                    order.createdAt.toISOString().split('T')[0],  // Format date as YYYY-MM-DD
                    order.orderId,
                    order.userId?.username,
                    order.status,
                    order.payment,
                    itemQty,
                    order.subTotal,
                    order.totalAmount
                ]);
        });

        // Set headers for the Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

        // Write the workbook to the response stream
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).send('Error generating Excel report');
    }
};

