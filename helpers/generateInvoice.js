import PDFdocument from 'pdfkit'
import fs from 'fs'

export const generateInvoice  = (order,user)=>{
    return  new Promise((resolve,reject)=>{
        try {
            const doc = new PDFdocument()

            const filePath = `./invoices/invoice_${order._id}.pdf`
            const stream = fs.createWriteStream(filePath)

            doc.pipe(stream)
            doc.fontSize(20).text('INVOICE', { align: 'center' });

            doc.moveDown();
            doc.fontSize(14).text(`Customer: ${user.name}`);
            doc.text(`Email: ${user.email}`);
            doc.text(`Order ID: ${order._id}`);
            doc.text(`Date: ${new Date().toLocaleDateString()}`);

            doc.moveDown();

            doc.fontSize(12).text('Item', 50, doc.y);
            doc.text('Quantity', 300, doc.y);
            doc.text('Price', 400, doc.y);
            doc.text('Total', 500, doc.y);
            doc.moveDown();

            let totalAmount = 0;

     
            order.items.forEach((item) => {
                const totalPrice = item.quantity * item.price;
                doc.text(item.name, 50, doc.y);
                doc.text(item.quantity, 300, doc.y);
                doc.text(`Rs. ${item.price}`, 400, doc.y);
                doc.text(`Rs. ${totalPrice}`, 500, doc.y);
                doc.moveDown();

                totalAmount += totalPrice;
            })

            doc.moveDown()

            doc.fontSize(14).text(`Total Amount: Rs. ${totalAmount}`, { align: 'right' });
            doc.end();
            stream.on('finish', () => resolve(filePath));
        } catch (error) {
            reject(error)
        }
    })
}