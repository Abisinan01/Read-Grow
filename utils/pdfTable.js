// pdfTable.js - Create this file in your utils folder
export const createTable = async (doc, table) => {
    const { headers, rows } = table;
    const tableTop = doc.y;
    const tableLeft = doc.page.margins.left;
    const headerHeight = 30;
    const rowHeight = 25;
    const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / headers.length;
    
    // Draw headers
    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((header, i) => {
        doc.text(
            header,
            tableLeft + i * colWidth + 5,
            tableTop + 10,
            { width: colWidth - 10, height: headerHeight, align: 'left' }
        );
    });
    
    // Draw header line
    doc.moveTo(tableLeft, tableTop + headerHeight)
        .lineTo(tableLeft + colWidth * headers.length, tableTop + headerHeight)
        .stroke();
    
    // Draw rows
    doc.font('Helvetica').fontSize(9);
    let currentTop = tableTop + headerHeight;
    
    rows.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (currentTop + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            currentTop = doc.page.margins.top;
            // Redraw headers on new page
            doc.font('Helvetica-Bold').fontSize(10);
            headers.forEach((header, i) => {
                doc.text(
                    header,
                    tableLeft + i * colWidth + 5,
                    currentTop + 10,
                    { width: colWidth - 10, height: headerHeight, align: 'left' }
                );
            });
            doc.moveTo(tableLeft, currentTop + headerHeight)
                .lineTo(tableLeft + colWidth * headers.length, currentTop + headerHeight)
                .stroke();
            currentTop += headerHeight;
            doc.font('Helvetica').fontSize(9);
        }
        
        // Draw cell content
        row.forEach((cell, cellIndex) => {
            doc.text(
                cell.toString(),
                tableLeft + cellIndex * colWidth + 5,
                currentTop + 7,
                { width: colWidth - 10, height: rowHeight, align: 'left' }
            );
        });
        
        // Draw row line
        currentTop += rowHeight;
        doc.moveTo(tableLeft, currentTop)
            .lineTo(tableLeft + colWidth * headers.length, currentTop)
            .stroke();
    });
    
    // Return the new Y position after the table
    return currentTop;
};
