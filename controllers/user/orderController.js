import mongoose from "mongoose"
import User from "../../models/userSchema.js"
import AppError from "../../utils/errorHandler.js"
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js"
import Address from "../../models/addressSchema.js"
import Cart from "../../models/cartSchema.js"
import Wishlist from "../../models/wishListSchema.js"
import Order from "../../models/orderSchema.js"
import Wallet from "../../models/walletSchema.js"
import PDFDocument from 'pdfkit'

export const renderOrdersPage = async (req, res, next) => {
  try {
    const user = req.user;
    const orders = await Order.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    if (orders.length === 0) {
      return res.status(200).render('user/order', { orders: [], user });
    }


    const allOrders = await Promise.all(
      orders.map(async (order) => {
        const itemsWithProductDetails = await Promise.all(
          order.items.map(async (item) => {
            const product = await Product.findById(item.productId).lean();
            return {
              productId: item.productId,
              name: product ? product.name : 'Product not found',
              price: item.price,
              quantity: item.quantity,
              status: item.status,
              image: product ? product.images[0] : null,
            };
          })
        );

        return {
          orderId: order.orderId,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          items: itemsWithProductDetails,
        };
      })
    );


    res.render('user/order', {
      orders: allOrders,
      user,
    });
  } catch (error) {
    console.error('Error rendering orders page:', error);
    next(new AppError(`Order page: ${error.message}`, 500));
  }
};

export const renderOrderDetailsPage = async (req, res, next) => {
  try {
    const user = req.user
    const addressId = req.session.order?.addressId

    const orderId = req.params.id
    const order = await Order.findOne({ orderId: orderId })
    if (!order) {
      return res.status(400).redirect("/read-and-grow/orders")
    }
    const deliveryAddress = await Address.findById(addressId)

    let orderedProducts = []
    for (let item of order.items) {
      const product = await Product.findById(item.productId)

      if (!product) { return res.json('product not found') }
      orderedProducts.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        image: product.images[0],
        price: product.price,
        status: item.status
      })
    }
    console.log("orderedProducts ", order)
    res.render('user/orderDetails', {
      orderedProducts,
      order,
      deliveryAddress,
      user
    })
  } catch (error) {
    next(new AppError(`Order details page : ${error}`, 500))
  }
}


// export const cancelOrders = async (req, res, next) => {
//   try {
//     const orderId = req.params.orderId
//     const reason = req.body.reason
//     const user = req.user
//     const order = await Order.findById(orderId)

//     if (!order) return res.status(400).json({ success: false, message: "Order not found" })
//     if (order.isCancelled) return res.status(400).json({ success: false, message: "Order already cancelled." })

//     let refundAmount = 0
//     for (let item of order.items) {
//       const product = await Product.findById(item.productId)
//       if (!product) return res.json({ message: "Product not found" })
//       if (item.isCancelled) return res.status(400).json({ message: "Product already cancelled" })

//       product.stock += item.quantity
//       refundAmount += product.price

//       order.items.forEach(item => {
//         if (item.productId.toString() == product._id.toString()) {
//           item.status = "Cancelled"

//         }
//       })
//       item.reason = reason
//       await product.save()
//     }

//     try {
//       let userWallet = await Wallet.findOne({ userId: user.id })
//       console.log(userWallet)


//       if (!userWallet) {
//         const newUserWallet = new Wallet({
//           userId: user.id,
//           balance: Number(refundAmount),
//           transactions: [{
//             orderId: order._id,
//             amount: Number(refundAmount),
//             transactionType: 'credit',
//             createdAt: new Date()
//           }]
//         })
//         await newUserWallet.save()
//       } else {
//         userWallet.balance += Number(refundAmount);
//         userWallet.transactions.push({
//           orderId: order._id,
//           amount: Number(refundAmount || 0),
//           transactionType: 'credit',
//           createdAt: new Date()
//         })
//         await userWallet.save()
//       }


//     } catch (walletError) {
//       console.error("Wallet updation failed : ", walletError)
//     }

//     const isCancelled = order.items.every(item => item.status == 'Cancelled')
//     if (isCancelled) {
//       order.status = "Cancelled"
//     }

//     const saveOrder = await order.save()
//     console.log(`Order cancelled..`)

//     return res.status(200).json({
//       success: true,
//       message: "Order cancelled successfully"
//     })

//   } catch (error) {
//     next(new AppError(`Order cancellation failed `, 500))
//   }
// }



export const singleCancelOrder = async (req, res, next) => {
  try {

    const productId = req.params.productId
    const orderId = req.params.orderId
    const user = req.user
    const reason = req.body.reason

    const orders = await Order.findById(orderId)
    console.log(orders, "orders")
    if (!orders) return res.status(404).json({ success: false, message: "Order not found" });

    const userWallet = await Wallet.findOne({ userId: user.id })
    if (!userWallet) {
      await Wallet.create({
        userId: user.id,
        balance: Number(0),
        transactions: []
      })
    }

    console.log("new wallet ", userWallet)

    let refundAmount = 0
    for (let item of orders.items) {

      if (item.productId.toString() === productId.toString() && !item.isCancelled) {
        const product = await Product.findById(productId)
        item.status = 'Cancelled',
          item.isCancelled = true
        item.reason = reason

        refundAmount += Number(product.price || 0)// For adding to wallet 

        await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } })
        console.log("hello")

        userWallet.balance = Number(userWallet.balance || 0) + Number(refundAmount);
        userWallet.transactions.push({
          orderId: orders._id,
          amount: Number(refundAmount),
          transactionType: 'credit',
          createdAt: new Date(),
        });
      }
    }
    await Order.findByIdAndUpdate(orderId, {
      $set: { paymentStatus: 'refunded' }
    })

    if (orders.items.every(item => item.status === "Delivered")) {
      orders.status = "Delivered";
    } else if (orders.items.every(item => item.status === "Cancelled")) {
      orders.status = "Cancelled";
    } else if (orders.items.some(item => item.status === "Returned")) {
      orders.status = "Returned";
    }

    await orders.save()
    await userWallet.save()
    console.log(`Order cancelled ${refundAmount}`)
    return res.status(200).json({ success: true, message: "Order successfully cancelled" })

    // return res.status(404).json({ success: false, message: "Product not found in order" })

  } catch (error) {
    next(new AppError(`Single order cancellation : ${error}`, 500))
  }
}



export const returnOrder = async (req, res, next) => {
  try { 

    const orderId = req.params.orderId
    console.log(orderId)
    const productId = req.params.productId
    const order = await Order.findById(orderId)
    const product = await Product.findById(productId)
    const user = req.user

    const wallet = await Wallet.findOne({ userId: order.userId })
    console.log("wallet ", wallet)

    const transaction = {
      orderId: new mongoose.Types.ObjectId(orderId),
      amount: Number(order.totalAmount),
      transactionType: "credit",
      createdAt: Date.now()
    }
    console.log(transaction)
    if (!wallet) {
      await Wallet.create({
        userId: user.id,
        balance: Number(order.totalAmount)
      })
    }

    await Wallet.findByIdAndUpdate(wallet._id, {
      $push: { transactions: transaction },
      $inc: { balance: Number(order.totalAmount) }
    })

    await Order.findByIdAndUpdate(orderId, {
      $set: { paymentStatus: 'refunded' }
    })


    for (let item of order.items) {
     const update = await Order.findByIdAndUpdate(product._id ,{
        $set: { status: "Returned", isReturned: true }
      })
      console.log(update)
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
    }

    return res.status(200).json({
      success: true, message: "Order returned successfully"
    })


  } catch (error) {
    next(new AppError(`return order failed : ${error}`, 500))
  }
}















//==============INVOICE==============
export const generateInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const user = req.user;
    const customer = await User.findById(user.id);

    // Log req.user to check if it's defined
    console.log('req.user:', user);

    // Ensure req.user is defined
    if (!user || !user.id) {
      return next(new AppError('User not authenticated. Please log in and try again.', 401));
    }

    // Find the order and populate product details
    const order = await Order.findById(orderId).populate('items.productId');

    // Log the order to check if it's defined
    console.log('order:', order);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if the user is authorized to access the order
    if (order.userId.toString() !== user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to access this order' });
    }

    // Check if order.items is defined and is an array
    if (!Array.isArray(order.items) || order.items.length === 0) {
      return next(new AppError('No items found in the order', 400));
    }

    // Check if order.totalAmount is defined
    if (typeof order.totalAmount !== 'number') {
      return next(new AppError('Total amount is missing or invalid in the order', 500));
    }

    // Create a user-friendly order ID format
    // Format: RG-YYYYMMDD-XXXX (where XXXX are the last 4 chars of the MongoDB ID)
    const orderDate = new Date(order.createdAt);
    const dateString = orderDate.toISOString().slice(0, 10).replace(/-/g, "");
    const idSuffix = orderId.slice(-4);
    const formattedOrderId = `RG-${dateString}-${idSuffix}`;

    // Create a new PDF document with pdfkit
    const doc = new PDFDocument({ margin: 40 });
    if (!doc) {
      return next(new AppError('Failed to create PDF document', 500));
    }

    const filename = `invoice_${formattedOrderId}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe the PDF directly to the response
    doc.pipe(res);

    // Define colors for styling
    const primaryColor = '#3B82F6'; // Bright blue
    const secondaryColor = '#1F2937'; // Dark gray-blue
    const accentColor = '#EFF6FF'; // Light blue background
    const highlightColor = '#DBEAFE'; // Highlight blue for alternating rows

    // Add a stylish header background
    doc
      .rect(0, 0, doc.page.width, 140)
      .fill(primaryColor);

    // Add company logo placeholder or actual logo
    // doc.image('path/to/logo.png', 40, 30, { width: 120 });

    // If no logo is available, create a stylish text logo
    doc
      .fillColor('white')
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('READ & GROW', 40, 50)
      .fontSize(12)
      .font('Helvetica')
      .text('Your Trusted Bookstore', 40, 80);

    // Company Details (right-aligned, in the blue header)
    doc
      .fontSize(10)
      .fillColor('white')
      .text('www.readandgrow.com', doc.page.width - 40, 50, { align: 'right' })
      .text('support@readandgrow.com', doc.page.width - 40, 65, { align: 'right' })
      .text('+91 123-456-7890', doc.page.width - 40, 80, { align: 'right' });

    // Add a decorative colored stripe
    doc
      .rect(0, 140, doc.page.width, 15)
      .fill('#93C5FD'); // Lighter blue

    // Invoice Title with styled box
    doc
      .rect(40, 170, doc.page.width - 80, 50)
      .fill(accentColor)
      .fillColor(secondaryColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('INVOICE', 50, 185)
      .fontSize(12)
      .font('Helvetica')
      .text(`Invoice #${formattedOrderId}`, 50, 210);

    // Add invoice date on the right side of the title box
    const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc
      .fontSize(10)
      .text(`Date: ${invoiceDate}`, doc.page.width - 200, 190, { align: 'right' });

    // Order Details and Customer Details in side-by-side boxes
    // Left box (Order Details)
    doc
      .rect(40, 240, 230, 100)
      .fill(highlightColor)
      .fillColor(secondaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Order Details', 55, 255)
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#4B5563')
      .text(`Order ID: ${formattedOrderId}`, 55, 280)
      .text(`Order Date: ${invoiceDate}`, 55, 300)
      .text(`Payment Method: ${order.paymentMethod || 'N/A'}`, 55, 320);

    // Right box (Customer Details)
    doc
      .rect(doc.page.width - 270, 240, 230, 100)
      .fill(highlightColor)
      .fillColor(secondaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Billed To', doc.page.width - 255, 255)
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#4B5563')
      .text(`Customer: ${customer.username}`, doc.page.width - 255, 280)
      .text(`Email: ${customer.email}`, doc.page.width - 255, 300);

    // Add phone if available
    if (customer.phone) {
      doc.text(`Phone: ${customer.phone}`, doc.page.width - 255, 320);
    }

    // Add billing address if available in a more compact format
    if (order.billingAddress) {
      const address = `${order.billingAddress.street}, ${order.billingAddress.city}, ${order.billingAddress.state} ${order.billingAddress.zip}`;

      doc
        .rect(40, 360, doc.page.width - 80, 35)
        .fill(accentColor)
        .fillColor(secondaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Shipping Address:', 55, 375)
        .font('Helvetica')
        .fillColor('#4B5563')
        .text(address, 150, 375, { width: 350 });
    }

    // Items Table Section with improved styling
    const tableTop = 420;

    // Table Header
    doc
      .rect(40, tableTop, doc.page.width - 80, 30)
      .fill(primaryColor);

    // Table Header Text
    const itemX = 55;
    const qtyX = 320;
    const priceX = 400;
    const totalX = 480;

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('white')
      .text('Item Description', itemX, tableTop + 10)
      .text('Qty', qtyX, tableTop + 10)
      .text('Price', priceX, tableTop + 10)
      .text('Total', totalX, tableTop + 10);

    // Table Rows with alternating background
    let position = tableTop + 35;

    // Draw table borders
    doc
      .rect(40, tableTop + 30, doc.page.width - 80, (order.items.length * 25) + 5)
      .stroke(primaryColor);

    // Draw vertical lines
    doc
      .moveTo(315, tableTop)
      .lineTo(315, tableTop + 30 + (order.items.length * 25) + 5)
      .moveTo(395, tableTop)
      .lineTo(395, tableTop + 30 + (order.items.length * 25) + 5)
      .moveTo(475, tableTop)
      .lineTo(475, tableTop + 30 + (order.items.length * 25) + 5)
      .stroke(primaryColor);

    // Fill in the rows
    order.items.forEach((item, index) => {
      if (!item.quantity || !item.price) {
        console.error(`Invalid item at index ${index}:`, item);
        return; // Skip invalid items
      }

      const productName = item.productId ? item.productId.name : item.productName || 'Unknown Product';
      const total = item.quantity * item.price;

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(40, position - 5, doc.page.width - 80, 25).fill(highlightColor);
      }

      doc
        .fillColor(secondaryColor)
        .fontSize(10)
        .font('Helvetica')
        .text(productName, itemX, position)
        .text(item.quantity.toString(), qtyX, position)
        .text(`₹${item.price.toFixed(2)}`, priceX, position)
        .text(`₹${total.toFixed(2)}`, totalX, position);

      position += 25;
    });

    // Summary Section with styled box
    const summaryTop = position + 20;

    doc
      .rect(doc.page.width - 250, summaryTop, 210, 100)
      .fill(accentColor);

    // Tax and Total Section (right-aligned)
    const taxRate = 0.05; // Example: 5% tax rate
    const subtotal = order.totalAmount / (1 + taxRate);
    const taxAmount = order.totalAmount - subtotal;

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(secondaryColor)
      .text('Summary', doc.page.width - 230, summaryTop + 15)
      .moveTo(doc.page.width - 250, summaryTop + 35)
      .lineTo(doc.page.width - 40, summaryTop + 35)
      .stroke(primaryColor);

    // Summary details
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', doc.page.width - 230, summaryTop + 45)
      .text(`₹${subtotal.toFixed(2)}`, doc.page.width - 80, summaryTop + 45, { align: 'right' })

      .text('Tax (5%):', doc.page.width - 230, summaryTop + 65)
      .text(`₹${taxAmount.toFixed(2)}`, doc.page.width - 80, summaryTop + 65, { align: 'right' })

      .rect(doc.page.width - 230, summaryTop + 80, 190, 1)
      .fill(primaryColor)

      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('TOTAL:', doc.page.width - 230, summaryTop + 90)
      .text(`₹${order.totalAmount.toFixed(2)}`, doc.page.width - 80, summaryTop + 90, { align: 'right' });

    // Footer with decorative elements
    const footerTop = doc.page.height - 100;

    // Add a footer background
    doc
      .rect(0, footerTop, doc.page.width, 100)
      .fill(accentColor);

    // Footer text
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('Thank you for shopping with Read & Grow!', 40, footerTop + 30, { align: 'center' })
      .fontSize(9)
      .font('Helvetica')
      .fillColor(secondaryColor)
      .text('Visit us at: www.readandgrow.com | Contact: +91 123-456-7890', 40, footerTop + 50, { align: 'center' })
      .text('This is a computer-generated invoice and does not require a signature.', 40, footerTop + 70, { align: 'center' });

    // Finalize the PDF
    doc.end();
  } catch (err) {
    console.error('Error generating invoice:', err.message);
    next(new AppError(`Error generating invoice: ${err.message}`, 500));
  }
};