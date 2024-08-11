const moment = require("moment");

/**
 * This function generates a header for the PDF document.
 *
 * @param {Object} doc - The PDFKit document object. This object is used to create and manipulate the PDF document.
 *
 * @returns {void} - The function does not return any value. It modifies the provided PDFKit document object directly.
 */
function generateHeader(doc) {
    doc.image("./src/upload/dropit-logo.jpeg", 210, 20, {
        align: "center",
        fit: [100, 100],
    });
    doc.font("Times-BoldItalic").fontSize(16).text(`"We Drop You Eat"`, 0, 100, {
        align: "center",
    });
    //     .fontSize(12);
    // doc.font("Helvetica-Bold")
    //     .text("GSTIN: 27AACCF5797L1ZY", 70, 100, { align: "center" })
    //     .fontSize(10.5);
    // doc.font("Helvetica").text(
    //     `Shiv samarth Apt, shop no.105, diva-agasan road, near siddhivinayak
    //         gate, diva E, Priyanka Niwas, bear govt school save gaon diva east Thane
    //         400613, Thane, THANE, MAHARASHTRA, 400612`,
    //     0,
    //     120,
    //     {
    //         align: "center",
    //     },
    // );
    doc.font("Helvetica-Bold").fontSize(12)
        .text("Email: dropeatdiva@gmail.com", 0, 125, {
            align: "center",
        })
        .moveDown();
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text(`INVOICE`, 0, 180, { align: "center" });
    // doc.moveTo(40, 360) // line position
    //     .lineTo(565, 360) //line postion and length
    //     .stroke()
    //     .moveDown();
}

/**
 * This function generates a footer for the PDF document.
 *
 * @param {Object} doc - The PDFKit document object.
 *
 * @returns {void} - The function does not return any value.
 */
function generateFooter(doc) {
    doc.font("Helvetica").fontSize(12);
    doc.fontSize(12).text("This is a computer generated invoice", 50, 705, {
        align: "center",
        width: 500,
    });
}

/**
 * This function generates and formats customer information on the PDF invoice.
 *
 * @param {Object} doc - The PDFKit document object. This object is used to create and manipulate the PDF document.
 * @param {Object} invoice - The invoice data object containing customer details.
 * @param {string} invoice.name - The customer's name.
 * @param {string} invoice.address - The customer's address.
 *
 * @returns {void} - The function does not return any value. It modifies the provided PDFKit document object directly.
 */
function generateCustomerInformation(doc, invoice) {
    doc.moveTo(50, 220).lineTo(565, 220).stroke().moveDown();

    doc.font("Helvetica")
        .fontSize(12)
        .text(`Bill to: ${invoice.name}`, 50, 230)
        // .text(`GST/PAN: ${invoice.Gst}`, 50, 115)
        .text(`Address: ${invoice.address}`, 50, 245);
    // .text(`Invoice Number: `, 460, 30)
    doc.font("Helvetica-Bold").text(`Date:`, 460, 200);
    doc.font("Helvetica")
        .text(`${moment().format("DD-MM-YY")}`, 490, 200)
        .moveDown();
}

/**
 * This function generates a table row for the PDF invoice.
 *
 * @param {Object} doc - The PDFKit document object. This object is used to create and manipulate the PDF document.
 * @param {number} y - The vertical position where the table row should be drawn.
 * @param {string} product - The name of the product.
 * @param {number} quantity - The quantity of the product.
 * @param {number} price - The price of the product.
 * @param {number} total - The total cost of the product.
 * @param {string} c5 - Additional column data (not used in this function).
 * @param {string} c6 - Additional column data (not used in this function).
 * @param {string} c7 - Additional column data (not used in this function).
 *
 * @returns {void} - The function does not return any value. It modifies the provided PDFKit document object directly.
 */
function generateTableRow(doc, y, product, quantity, price, total, c5, c6, c7) {
    doc.fontSize(10)
        .text(product, 50, y, { width: 65 }) // data positionX
        .text(quantity, 310, y)
        .text(price, 410, y)
        .text(total, 480, y, { width: 50, align: "right" });
    // .text(c5, 335, y, { width: 50, align: "right" })
    // .text(c6, 380, y, { width: 80, align: "right" })
    // .text(c7, 240, y, { width: 290, align: "right" });
}

/**
 * This function generates and formats the invoice table on the PDF document.
 *
 * @param {Object} doc - The PDFKit document object. This object is used to create and manipulate the PDF document.
 * @param {Object} invoice - The invoice data object containing items details.
 * @param {Array} invoice.items - An array of objects representing each item in the invoice.
 * @param {string} invoice.items[].item - The name of the product.
 * @param {number} invoice.items[].quantity - The quantity of the product.
 * @param {number} invoice.items[].amount - The price of the product.
 *
 * @returns {void} - The function does not return any value. It modifies the provided PDFKit document object directly.
 */
function generateInvoiceTable(doc, invoice) {
    let i,
        invoiceTableTop = 325;
    // const tableTop = 350;
    const rowHeight = 30;
    let y = invoiceTableTop;
    doc.font("Helvetica-Bold")
        .fontSize(12)
        .text(`Product`, 50, 315)
        .text(`Product`, 50, 315)
        .text(`Quantity`, 290, 315)
        .text(`Quantity`, 290, 315)
        .text(`Price`, 410, 315)
        .text(`Price`, 410, 315)
        // .text(`IGST     18%`, 290, 330, { width: 40 })
        // .text(`IGST     18%`, 290, 330, { width: 40 })
        // .text(`CGST     9%`, 360, 330, { width: 40 })
        // .text(`CGST     9%`, 360, 330, { width: 40 })
        // .text(`IGST     9%`, 440, 330, { width: 40 })
        // .text(`IGST     9%`, 440, 330, { width: 40 })
        .text(`Total`, 508, 315)
        .text(`Total`, 508, 315);
    for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.item,
            // invoice.sac,
            item.quantity,
            item.amount,
            // "---",
            // invoice.items[0].amount * 0.09,
            // invoice.items[0].amount * 0.09,
            item.quantity * item.amount,
        );
        // Draw a line at the end of the table
        doc.moveTo(40, y + (invoice.items.length + 1) * rowHeight)
            .lineTo(565, y + (invoice.items.length + 1) * rowHeight)
            .stroke();
        doc.font("Helvetica")
            .text(
                `Subtotal:                        ${invoice.subtotal}`,
                400,
                y + 10 + (invoice.items.length + 1) * rowHeight,
            )
            .text(
                `Platform fee:                  ${invoice.platformFee}`,
                400,
                y + 25 + (invoice.items.length + 1) * rowHeight,
            )
            .text(
                `Delivery charges:           ${invoice.deliveryCharges}`,
                400,
                y + 40 + (invoice.items.length + 1) * rowHeight,
            )
            .text(
                `GST:                               ${invoice.gst}`,
                400,
                y + 60 + (invoice.items.length + 1) * rowHeight,
            );
        doc.moveTo(380, y + 75 + (invoice.items.length + 1) * rowHeight)
            .lineTo(565, y + 75 + (invoice.items.length + 1) * rowHeight)
            .stroke()

            // doc.moveTo(380, y + 55 + (invoice.items.length + 1) * rowHeight)
            //     .lineTo(565, y + 55 + (invoice.items.length + 1) * rowHeight)
            //     .stroke()
            .text(
                `TOTAL:                         ${invoice.total}`,
                400,
                y + 90 + (invoice.items.length + 1) * rowHeight,
            );
    }

    doc.moveTo(40, 340) // line position
        .lineTo(565, 340) //line postion and length
        .stroke()
        .moveDown();
    doc.moveTo(40, 300) // line position
        .lineTo(565, 300) //line postion and length
        .stroke()
        .moveDown();
}

module.exports = {
    generateHeader,
    generateFooter,
    generateInvoiceTable,
    generateCustomerInformation,
};
