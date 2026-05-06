const PDFDocument = require('pdfkit');
const fs = require('fs');

// Test simple para verificar que PDFKit funciona
async function testPDF() {
  try {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      fs.writeFileSync('/tmp/test.pdf', pdfBuffer);
      console.log('✅ PDF generado exitosamente en /tmp/test.pdf');
    });
    doc.on('error', (error) => {
      console.error('❌ Error generando PDF:', error);
    });

    // Contenido simple
    doc.fontSize(20).text('Test PDF', 50, 50);
    doc.fontSize(12).text('Este es un test de PDFKit', 50, 80);

    doc.end();
  } catch (error) {
    console.error('❌ Error en test PDF:', error);
  }
}

testPDF();