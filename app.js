(() => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const output = document.getElementById('output');
  const btnImgToPdf = document.getElementById('btnImgToPdf');
  const btnMergePdf = document.getElementById('btnMergePdf');
  const btnClear = document.getElementById('btnClear');

  let files = [];

  const human = (bytes) => {
    const units = ['B','KB','MB','GB'];
    let i=0, b=bytes;
    while (b>1024 && i<units.length-1){ b/=1024; i++; }
    return b.toFixed(1)+' '+units[i];
  };

  const renderList = () => {
    fileList.innerHTML = '';
    files.forEach((f, idx) => {
      const pill = document.createElement('div');
      pill.className = 'file-pill';
      pill.textContent = `${idx+1}. ${f.name} (${human(f.size)})`;
      fileList.appendChild(pill);
    });
  };

  const addFiles = (list) => {
    const arr = Array.from(list || []);
    const accepted = arr.filter(f => /pdf|jpeg|jpg|png/i.test(f.type) || /\.pdf$/i.test(f.name));
    files = files.concat(accepted).slice(0, 20);
    renderList();
  };

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault(); dropzone.classList.add('drag');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault(); dropzone.classList.remove('drag');
    addFiles(e.dataTransfer.files);
  });
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => addFiles(e.target.files));
  btnClear.addEventListener('click', () => { files = []; renderList(); output.innerHTML = ''; });

  btnImgToPdf.addEventListener('click', async () => {
    const images = files.filter(f => /jpeg|jpg|png/i.test(f.type));
    if(images.length === 0) { alert('Dodaj najpierw JPG/PNG.'); return; }

    const { PDFDocument, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    for (const imgFile of images) {
      const arr = await imgFile.arrayBuffer();
      let img;
      if (/png/i.test(imgFile.type)) img = await pdfDoc.embedPng(arr);
      else img = await pdfDoc.embedJpg(arr);

      const A4 = { w: 595.28, h: 841.89 };
      const page = pdfDoc.addPage([A4.w, A4.h]);

      const margin = 24;
      const maxW = A4.w - margin * 2;
      const maxH = A4.h - margin * 2;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (A4.w - w)/2;
      const y = (A4.h - h)/2;
      page.drawImage(img, { x, y, width: w, height: h });

      page.drawRectangle({ x:0, y:0, width:A4.w, height:A4.h, color: rgb(1,1,1), opacity: 0.001 });
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    output.innerHTML = `<a download="DinoFiles_A4.pdf" href="${url}">Pobierz PDF („DinoFiles_A4.pdf”)</a>`;
  });

  btnMergePdf.addEventListener('click', async () => {
    const pdfs = files.filter(f => /pdf$/i.test(f.name));
    if(pdfs.length < 2) { alert('Dodaj co najmniej 2 pliki PDF.'); return; }

    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (const f of pdfs) {
      const bytes = await f.arrayBuffer();
      const donor = await PDFDocument.load(bytes);
      const copied = await mergedPdf.copyPages(donor, donor.getPageIndices());
      copied.forEach(p => mergedPdf.addPage(p));
    }

    const bytes = await mergedPdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    output.innerHTML = `<a download="DinoFiles_Merged.pdf" href="${url}">Pobierz scalony PDF („DinoFiles_Merged.pdf”)</a>`;
  });

})();