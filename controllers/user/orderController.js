import mongoose, { skipMiddlewareFunction } from "mongoose"
import User from "../../models/userSchema.js"
import AppError from "../../utils/errorHandler.js"
import Product from "../../models/productSchema.js"
import Category from "../../models/categorySchema.js"
import Address from "../../models/addressSchema.js"
import Order from "../../models/orderSchema.js"
import Wallet from "../../models/walletSchema.js"
import { generateInvoice } from '../../services/invoiceService.js';
import Coupon from "../../models/couponSchema.js"
export const renderOrdersPage = async (req, res, next) => {
  try {
    let { page, limit } = req.query
    page = parseInt(page) || 1
    limit = parseInt(limit) || 5
    let skip = (page - 1) * limit

    if (req.session.order) req.session.order = null//ORDER CONFIRMATION PAGE SESSION MANAGE

    const user = req.user;
    const orders = await Order.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean()
      .skip(skip)
      .limit(limit)

    let count = 0
    const totalOrders = await Order.find({ userId: user.id }).countDocuments()
    const totalPages = Math.ceil(totalOrders / limit)

    if (orders.length === 0) {
      return res.status(200).render('user/order', { orders: [], user });
    }

    //THIS FOR FETCHING ALL ORDERS ASYNCHRONUSLY AND FIND ITEMS DETAILS
    const allOrders = await Promise.all(
      orders.map(async (order) => {// MAP EACH ORDERS
        const itemsWithProductDetails = await Promise.all(
          order.items.map(async (item) => {//MAP EACH ITEM INSIDE ITEMS
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

    console.log("allOrders :", allOrders)

    res.render('user/order', {
      orders: allOrders,
      user,
      page, limit,
      totalOrders, totalPages
    });
  } catch (error) {
    console.error('Error rendering orders page:', error);
    next(new AppError(`Order page: ${error.message}`, 500));
  }
};

export const renderOrderDetailsPage = async (req, res, next) => {
  try {
    const user = req.user
    if (req.session.order) req.session.order = null//ORDER CONFIRMATION PAGE SESSION MANAGE
    // const addressId = req.session.order
    // console.log(" addresssId", addressId)
    const orderId = req.params.id
    const order = await Order.findOne({ orderId: orderId })
      .populate('coupon')

    if (!order) {
      return res.status(400).redirect("/orders")
    }
    const deliveryAddress = await Address.findById(order.addressId)
    console.log(deliveryAddress)

    let orderedProducts = []//STORE ALL PRODUCTS INCLUDE ORDERS
    for (let item of order.items) {
      const product = await Product.findById(item.productId)

      if (!product) { return res.json('product not found') }

      orderedProducts.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        image: product.images[0],
        price: product.price,
        status: item.status,
        isRequested: item.isRequested
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


export const singleCancelOrder = async (req, res, next) => {
  try {
    const productId = req.params.productId
    const orderId = req.params.orderId
    const user = req.user
    const reason = req.body.reason

    //FIND ORDERS WITH LOOKUP COUPON
    const orders = await Order.findById(orderId).populate('coupon');

    if (!orders) {
      return res.json({ success: false, message: "Orders not found" })
    }

    //CREATE TRANSACTION ID
    const transactionID = `TRANS-${Date.now()}`;
    console.log(transactionID)

    let applyCouponAmount = 0
    applyCouponAmount = orders.coupon?.discountValue || 0;
    console.log("Discount coupon Value:", applyCouponAmount);

    const userWallet = await Wallet.findOne({ userId: user.id })
    //IF WALLET NOT AVAILABLE CREATE NO
    if (!userWallet) {
      await Wallet.create({
        userId: user.id,
        balance: 0,
        transactions: []//SET EMPTY ARRAY
      })
    }

    let refundAmount = 0
    for (let orderItem of orders.items) {
      if (orderItem.productId.toString() === productId.toString()) {

        //TAKE UNCANCELLTED PRODUCTS
        const remainingItems = orders.items.filter(item =>
          item.status !== 'Cancelled' &&
          item.status !== 'Returned'
        );

        let remainingItemsTotal = applyCouponAmount;//REMAINING ITEMS TOTAL PRICE
        for (let item of remainingItems) {
          const discount = item.discountPrice || 0;//PRODUCT OR CATEGORY OFFERS 
          remainingItemsTotal += (item.price - discount) * item.quantity;
        }
        console.log("remainingItemsTotal", remainingItemsTotal);//DEBUG

        //REDUCE APPLIED COUPON AMOUNT
        if (orders.coupon && remainingItemsTotal >= orders.coupon?.minPurchase) {

          if (orderItem.discountPrice > 0) {
            refundAmount += (orderItem.price * orderItem.quantity) - orderItem.discountPrice
            orders.totalAmount -= refundAmount
          } else {
            refundAmount += (orderItem.price * orderItem.quantity)
            orders.totalAmount -= refundAmount
          }

        } else {
          if (orders.coupon) {
            // remainingItemsTotal -= orders.coupon.discountValue
            refundAmount -= orders.coupon.discountValue//KEEP -VE COUPON VALUE REFUND ITS WILL SOLVE WHEN PRODUCT AMOUNT ADDED

            orders.isCouponAvailable = false//MAKE COUPON FALSE

            //REMOVE APPLIED COUPON 
            await Coupon.findByIdAndUpdate(
              orders.coupon._id,
              { $pull: { isUsed: user.id } }//MARK UNUSED
            );
            console.log(`Coupon amount ${applyCouponAmount} reverted`);

          }

          //REFUND SETTING
          if (orderItem.discountPrice > 0) {
            refundAmount += (orderItem.price * orderItem.quantity) - orderItem.discountPrice
            orders.totalAmount -= refundAmount
          } else {
            refundAmount += (orderItem.price * orderItem.quantity)
            orders.totalAmount -= refundAmount
          }
        }

        console.log(refundAmount, "refundAmount without coupon")

        //UPDATE INVENTORY
        await Product.findByIdAndUpdate(productId, { $inc: { stock: orderItem.quantity } })
        orderItem.status = 'Cancelled',
          orderItem.isCancelled = true
        orderItem.reason = reason

        //UPDATE WALLET
        userWallet.balance += Number(refundAmount) || 0;
        userWallet.transactions.push({
          orderId: orders._id,
          transactionId: transactionID,
          amount: Number(refundAmount),
          transactionType: 'credit',
          source: 'refund',
          createdAt: new Date(),
          productId
        });
      }
      console.log("userWallet ", userWallet)
    }

    if (orders.items.every(item => item.status === 'Returned' || item.status === 'Cancelled')) {
      orders.paymentStatus = "Refunded";
    }

    if (orders.items.every(item => item.status === "Delivered")) {
    } else if (orders.items.every(item => item.status === "Cancelled")) {
      orders.status = "Cancelled";
    } else if (orders.items.some(item => item.status === "Returned")) {
      orders.status = "Returned";
    }

    await orders.save()
    await userWallet.save()
    console.log(`Order cancelled ${refundAmount}`)
    return res.status(200).json({ success: true, message: "Order successfully cancelled" })

  } catch (error) {
    next(new AppError(`Single order cancellation : ${error}`, 500))
  }
}


export const returnOrder = async (req, res, next) => {
  try {
    const productId = req.params.productId
    const orderId = req.params.orderId
    const user = req.user
    const reason = req.body.reason

    const orders = await Order.findById(orderId)
    console.log(orders, "orders")

    if (!orders) return res.status(404).json({ success: false, message: "Order not found" });

    let refundAmount = 0
    for (let item of orders.items) {
      if (item.productId.toString() === productId.toString() && !item.isRequested) {
        const product = await Product.findById(productId)
        item.isRequested = true
        item.reason = reason
      }
    }

    await orders.save()
    // console.log(`Order cancelled ${refundAmount}`)
    return res.status(200).json({ success: true, message: "Return request has done" })

  } catch (error) {
    next(new AppError(`Single order cancellation : ${error}`, 500))
  }
}


export const payUsingWallet = async (req, res, next) => {
  try {
    const { finalPrice } = req.body
    console.log(req.body)
    const user = req.user
    const wallet = await Wallet.findOne({ userId: user.id })

    //CREATE NEW TRANSACTION ID
    const transactionID = `TRANS-${Date.now()}`;

    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet is not found" })
    }
    //CHECK ENOUGH MONEY HAD IN WALLET
    if (finalPrice > wallet.balance) {
      return res.status(400).json({ success: false, message: "Wallet does not have enough money." })
    }

    //UPDATE WALLET
    const debitFromWallet = await Wallet.findByIdAndUpdate(
      wallet._id,
      {
        $inc: { balance: -finalPrice },//DECREASE WALLET AMOUNT
        $push: {
          transactions: {
            amount: finalPrice,
            transactionType: "debit",
            transactionId: transactionID,
            source: "purchase"
          }
        }
      },
      { new: true }
    );
    console.log('debit from wallet ', debitFromWallet)

    return res.status(200).json({ success: true, message: "Payment successfully done" })
  } catch (error) {
    next(new AppError(`Wallet payment failed : ${error}`, 500))
  }
}



export const downloadInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const user = await User.findById(req.user.id);
    const order = await Order.findById(orderId).populate('addressId').populate('coupon');

    if (!order) {
      return res.status(400).json({ success: false, message: "Invalid order details" });
    }

    const invoicePath = await generateInvoice(order, user);

    res.download(invoicePath);
  } catch (error) {
    console.error("Error generating invoice:", error);
    next(new AppError(`Invoice generation failed: ${error.message}`, 500));
  }
};
