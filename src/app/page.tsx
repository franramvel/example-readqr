'use client'

import styles from './page.module.css'
import jsQR, { QRCode } from 'jsqr';
import { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

export default function Home() {
  const [qrData, setQrData] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file!.type === 'application/pdf') {
      // If it's a PDF file, handle it as a PDF.
      try {
        const pdfData = await getPdfDataFromFile(file!);
        const imageUrls = await extractImagesFromPDF(pdfData);

        if (imageUrls.length > 0) {
          const code = await detectQRCodeInImages(imageUrls);
          if (code) {
            setQrData(code.data);
          } else {
            setQrData(null);
          }
        } else {
          setQrData(null);
        }
      } catch (error) {
        console.error("Error al procesar el PDF:", error);
        setQrData(null);
      }
    }if (file) {
      const imageData = await getImageDataFromFile(file);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setQrData(code.data);
      } else {
        setQrData(null);
      }
    }
  };

  const getImageDataFromFile = (file: File): Promise<ImageData> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target!.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve(ctx!.getImageData(0, 0, img.width, img.height));
        };
      };
      reader.readAsDataURL(file);
    });
  };
  const getPdfDataFromFile = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = new Uint8Array(e.target!.result as ArrayBuffer);
        resolve(arrayBuffer);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const extractImagesFromPDF = async (pdfData: Uint8Array): Promise<string[]> => {
    const pdfWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;
    const imageUrls: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context!, viewport: viewport }).promise;

      const imageUrl = canvas.toDataURL('image/png');
      imageUrls.push(imageUrl);
    }

    return imageUrls;
  };

  const detectQRCodeInImages = async (imageUrls: string[]): Promise<QRCode | null> => {
    for (const imageUrl of imageUrls) {
      const imageData = await getImageDataFromImageUrl(imageUrl);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        return code;
      }
    }
    return null;
  };

  const getImageDataFromImageUrl = (imageUrl: string): Promise<ImageData> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(ctx!.getImageData(0, 0, img.width, img.height));
      };
    });
  };
  return (
    <main className={styles.main}>
      <input type="file" id="qr-input" onChange={handleFileChange} ></input>
      {qrData ? (
        <p>Contenido del código QR: {qrData}</p>
      ) : (
        <p>No se encontró un código QR en la imagen.</p>
      )}
    </main>
  )
}
