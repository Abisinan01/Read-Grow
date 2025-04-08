import mongoose, { skipMiddlewareFunction } from "mongoose"
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
import fs from 'fs'
import { successPage } from "./checkoutController.js"
export const renderOrdersPage = async (req, res, next) => {
  try {
    let { page, limit } = req.query
    page = parseInt(page) || 1
    limit = parseInt(limit) || 5
    let skip = (page - 1) * limit

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
    // const addressId = req.session.order
    // console.log(" addresssId", addressId)
    const orderId = req.params.id
    const order = await Order.findOne({ orderId: orderId })
      .populate('coupon')
    if (!order) {
      return res.status(400).redirect("/read-and-grow/orders")
    }
    const deliveryAddress = await Address.findById(order.addressId)
    console.log(deliveryAddress)
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


export const singleCancelOrder = async (req, res, next) => {
  try {
    const productId = req.params.productId
    const orderId = req.params.orderId
    const user = req.user
    const reason = req.body.reason

    const orders = await Order.findById(orderId).populate('coupon');

    if (!orders) {
      return res.json({ success: false, message: "Orders not found" })
    }

    const transactionID = `TRANS-${Date.now()}`;
    console.log(transactionID)

    let applyCouponAmount = 0
    applyCouponAmount = orders.coupon?.discountValue;
    console.log("Discount coupon Value:", applyCouponAmount);

    const userWallet = await Wallet.findOne({ userId: user.id })
    if (!userWallet) {
      await Wallet.create({
        userId: user.id,
        balance:0,
        transactions: []
      })
    }

    let refundAmount = 0
    for (let item of orders.items) {
      if (item.productId.toString() === productId.toString()) {
        const product = await Product.findById(productId)

        const remainingItems = orders.items.filter(item =>
          !(item.productId.toString() === productId) &&
          item.status !== 'Cancelled' &&
          item.status !== 'Returned'
        );
        console.log("remainingItems ", remainingItems)

        let remainingItemsTotal = 0
        for(let item of remainingItems) {
          remainingItemsTotal += item.price * item.quantity - (item?.discountPrice || 0)
        }
        console.log("remainingItemsTotal ", remainingItemsTotal)

        if (orders.coupon && remainingItemsTotal >= orders.coupon.minPurchase) {
          refundAmount = Number(item.price * item.quantity - (item?.discountPrice || 0))
          console.log(refundAmount, "refundAmount without coupon")
        } else {
          if (orders.coupon) {
            await Coupon.findByIdAndUpdate(
              orders.coupon._id, 
              { $pull: { isUsed: user.id } }
            );
            console.log("Coupon usage reverted");
            await Order.findByIdAndUpdate(orders._id,{$unset:{coupon:""}})
          }

          if (remainingItems.length === 0) {
            refundAmount = Number(orders.totalAmount - orders.shippingCharge);
          } else if (item.discountPrice > 0) {
            refundAmount = Number(item.price * item.quantity - (item?.discountPrice || 0));
          } else {
            refundAmount = Number((orders.totalAmount-orders.shippingCharge) - remainingItemsTotal);
          }
          console.log(refundAmount, "refundAmount without coupon")  
        } 
 
        await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } })

        item.status = 'Cancelled',
        item.isCancelled = true
        item.reason = reason

        userWallet.balance += Number(refundAmount);
        userWallet.transactions.push({
          orderId: orders._id,
          transactionId : transactionID,
          amount: Number(refundAmount),
          transactionType: 'credit',
          source:'refund',
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

    // return res.status(404).json({ success: false, message: "Product not found in order" })

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

    const transactionID = `TRANS-${Date.now()}`;
    console.log(transactionID)

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

        if (item.productId.toString() === productId.toString() && !item.isRequested) {
          const product = await Product.findById(productId)
          // item.status = 'Requested',
          item.isRequested = true
          item.reason = reason

          // if (orders.paymentStatus !== 'failed') {
          //   refundAmount += Number(product.price || 0)// For adding to wallet 

          //   await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } })

          //   userWallet.balance = Number(userWallet.balance || 0) + Number(refundAmount);
          //   userWallet.transactions.push({
          //     orderId: orders._id,
          //     amount: Number(refundAmount),
          //     transactionType: 'credit',
          //      transactionId:transactionID
          //     createdAt: new Date(),
          //   });
          // }
        }
      }
 
      // if (orders.items.every(item => item.status === 'Returned' || item.status === 'Cancelled')) {
      //   orders.paymentStatus = "Refunded";
      // }

    // if (orders.items.every(item => item.status === "Delivered")) {
    //   orders.status = "Delivered";
    // } else if (orders.items.every(item => item.status === "Cancelled")) {
    //   orders.status = "Cancelled";
    // } else if (orders.items.some(item => item.status === "Returned")) {
    //   orders.status = "Returned";
    // }

    await orders.save()
    await userWallet.save()
    // console.log(`Order cancelled ${refundAmount}`)
    return res.status(200).json({ success: true, message: "Return request has done" })

    // return res.status(404).json({ success: false, message: "Product not found in order" })

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
    
    const transactionID = `TRANS-${Date.now()}`;

    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet is not found" })
    }

    if (finalPrice > wallet.balance) {
      return res.status(400).json({ success: false, message: "Wallet does not have enough money." })
    }

    const debitFromWallet = await Wallet.findByIdAndUpdate(
      wallet._id,
      {
        $inc: { balance: -finalPrice },
        $push: { transactions: { 
          amount: finalPrice, 
          transactionType: "debit" , 
          transactionId:transactionID , 
          source:"purchase"
        }}
      },
      { new: true }
    );
    console.log('debit from wallet ', debitFromWallet)

    return res.status(200).json({ success: true, message: "Payment successfully done" })
  } catch (error) {
    next(new AppError(`Wallet payment failed : ${error}`, 500))
  }
}



import pdf from 'html-pdf';
import { generateInvoice } from '../../services/invoiceService.js';
import Coupon from "../../models/couponSchema.js"
import { count } from "console"

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
