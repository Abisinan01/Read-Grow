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
        balance: 0,
        transactions: []
      })
    }

    let refundAmount = 0
    for (let item of orders.items) {
      if (item.productId.toString() === productId.toString()) {
        const product = await Product.findById(productId)

        const remainingItems = orders.items.filter(item =>
          item.status !== 'Cancelled' &&
          item.status !== 'Returned'
        );
        console.log("remainingItems ", remainingItems)

        let remainingItemsTotal = 0
        for (let item of remainingItems) {
          if (item.discountPrice > 0) {
            remainingItemsTotal += (item.price * item.quantity) - item.discountPrice
          } else {
            remainingItemsTotal += (item.price * item.quantity)
          }
          // if (orders.items[0]) remainingItemsTotal -= remainingItemsTotal - orders.shippingCharge// minus shipping charge
          console.log("remainingItemsTotal ", remainingItemsTotal)
        }

        //comparing with coupon amount
        if (orders.coupon && remainingItemsTotal >= orders.coupon.minPurchase) {
          // refundAmount = Number(item.price * item.quantity - (item?.discountPrice || 0))
          if (item.discountPrice > 0) {
            refundAmount += (item.price * item.quantity) - item.discountPrice
          } else {
            refundAmount += (item.price * item.quantity)
          }
          console.log(refundAmount, "refundAmount without coupon")
        } else {
          if (orders.coupon) {
            orders.totalAmount -= orders.coupon.discountValue// minus coupon amount from totalAmount
            await Coupon.findByIdAndUpdate(
              orders.coupon._id,
              { $pull: { isUsed: user.id } }
            );
            console.log("Coupon usage reverted");
          }
          if (remainingItems.length === 0) {
            // refundAmount = Number(orders.totalAmount-remainingItemsTotal);
            // console.log(refundAmount)

          } else if (item.discountPrice > 0) {
            refundAmount += (item.price * item.quantity) - item.discountPrice
            console.log(refundAmount, "refundAmount without coupon")

          } else {
            refundAmount += (item.price * item.quantity)

          }
          console.log(refundAmount, "refundAmount without coupon")
        }


        await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } })

        item.status = 'Cancelled',
          item.isCancelled = true
        item.reason = reason

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

    // return res.status(404).json({ success: false, message: "Product not found in order" })

  } catch (error) {
    next(new AppError(`Single order cancellation : ${error}`, 500))
  }
}
