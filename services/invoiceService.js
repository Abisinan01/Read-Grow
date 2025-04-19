import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const invoiceDir = path.join(__dirname, "../public/invoices");

if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true });
}

export const generateInvoice = async (order, user) => {
    return new Promise((resolve, reject) => {
        try {
            const invoicePath = path.join(invoiceDir, `invoice_${order._id}.pdf`);
            const doc = new PDFDocument({ margin: 50 });

            const stream = fs.createWriteStream(invoicePath);
            doc.pipe(stream);

            // Header with logo and company info
            doc.fontSize(24).font('Helvetica-Bold').text("READ & GROW", { align: 'center' });
            doc.fontSize(10).font('Helvetica').text("Professional Book Store", { align: 'center' });
            doc.moveDown(0.5);
            
            // Add a horizontal divider
            doc.moveTo(50, doc.y)
               .lineTo(doc.page.width - 50, doc.y)
               .stroke();
            doc.moveDown();

            // Invoice details in a more structured format
            const rightColumn = doc.page.width - 200;
            
            doc.font('Helvetica-Bold').fontSize(14).text("INVOICE", { align: 'left' });
            doc.font('Helvetica').fontSize(10);
            doc.text(`Invoice #: ${order.orderId}`);
            doc.text(`Date: ${new Date().toLocaleDateString()}`);
            doc.moveDown(0.5);
            
            // Customer info
            doc.font('Helvetica-Bold').fontSize(11).text("BILLED TO:");
            doc.font('Helvetica').fontSize(10);
            doc.text(`${order.addressId.firstName} ${order.addressId.lastName}`);
            doc.text(`${order.addressId.street}, ${order.addressId.city}`);
            doc.text(`${order.addressId.state} - ${order.addressId.pincode}`);
            doc.text(`Phone: ${order.addressId.phoneNumber}`);
            doc.text(`Email: ${user.email || "Not provided"}`);
            doc.moveDown();

            // Table header with subtle styling
            doc.font('Helvetica-Bold').fontSize(10);
            const startX = 50;
            let startY = doc.y;
            const colWidths = [240, 60, 100, 100];
            const rowHeight = 20;

            // Header row with light gray background
            doc.rect(startX, startY, colWidths.reduce((a, b) => a + b), rowHeight).fill("#f5f5f5").stroke("#cccccc");
            doc.fillColor("black").text("Item Description", startX + 5, startY + 6);
            doc.text("Qty", startX + colWidths[0] + 15, startY + 6);
            doc.text("Unit Price", startX + colWidths[0] + colWidths[1] + 5, startY + 6);
            doc.text("Amount", startX + colWidths[0] + colWidths[1] + colWidths[2] + 20, startY + 6);
            startY += rowHeight;

            // Table Rows with alternating subtle background
            doc.font('Helvetica').fontSize(10);
            order.items.forEach((item, index) => {
                // Add subtle alternating row colors
                if (index % 2 === 1) {
                    doc.rect(startX, startY, colWidths.reduce((a, b) => a + b), rowHeight).fill("#fafafa").stroke("#cccccc");
                } else {
                    doc.rect(startX, startY, colWidths.reduce((a, b) => a + b), rowHeight).stroke("#cccccc");
                }
                
                doc.fillColor("black").text(item.productName, startX + 5, startY + 6);
                doc.text(item.quantity.toString(), startX + colWidths[0] + 25, startY + 6);
                doc.text(`${item.price.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + 5, startY + 6);
                doc.text(`${(item.price * item.quantity).toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + 20, startY + 6);
                startY += rowHeight;
            });

            // Summary section with proper alignment and formatting
            doc.moveDown();
            
            // Add divider before totals
            doc.moveTo(startX + colWidths[0] + colWidths[1], doc.y)
               .lineTo(doc.page.width - 50, doc.y)
               .stroke();
            doc.moveDown(0.5);
            
            const summaryX = startX + colWidths[0] + colWidths[1];
            const valueX = startX + colWidths[0] + colWidths[1] + colWidths[2];
            
            doc.font('Helvetica').fontSize(10).text("Subtotal:", summaryX, doc.y);
            doc.text(`${order.subTotal }`, valueX + 20, doc.y - 10, { align: "right" });

            doc.font('Helvetica').fontSize(10).text("Discount:", summaryX, doc.y);
            doc.text(`${order.discount }`, valueX + 20, doc.y - 10, { align: "right" });

            if (order.coupon) {
                doc.text("Coupon:", summaryX, doc.y);
                doc.text(`${order.coupon.discountValue }`, valueX + 20, doc.y - 10, { align: "right" });
            }
            
            if (order.shippingCharge) {
                doc.text("Shipping:", summaryX, doc.y);
                doc.text(`${order.shippingCharge }`, valueX + 20, doc.y - 10, { align: "right" });
            }
            
            // Add divider before final total
            doc.moveTo(summaryX, doc.y)
               .lineTo(doc.page.width - 50, doc.y)
               .stroke();
            doc.moveDown(0.5);
            
            // Total with bold formatting
            doc.font('Helvetica-Bold').fontSize(12).text("TOTAL:", summaryX, doc.y);
            doc.text(`Rs. ${order.totalAmount}`, valueX + 20, doc.y - 12, { align: "right" });
            
            // Footer
            doc.moveDown(2);
            
            // Add a horizontal divider
            doc.moveTo(50, doc.y)
               .lineTo(doc.page.width - 50, doc.y)
               .stroke();
            doc.moveDown();
            
            // Payment terms and notes
            doc.fontSize(9).font('Helvetica-Bold').text("Payment Terms:", 50, doc.y);
            doc.font('Helvetica').text("Payment due within 15 days of invoice date.");
            doc.moveDown(0.5);
            
            doc.font('Helvetica-Bold').text("Notes:");
            doc.font('Helvetica').text("Thank you for your business. For any queries related to this invoice, please contact our customer support.");
            
            // Final footer with contact info
            doc.fontSize(8).text("Read & Grow Book Store | www.readandgrow.com | support@readandgrow.com | +91 9876543210", {
                align: "center",
                bottom: 50
            });

            doc.end();

            stream.on('finish', () => {
                resolve(invoicePath);
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
};