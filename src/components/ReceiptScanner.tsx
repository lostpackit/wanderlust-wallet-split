import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, Loader2, Crop, Check, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactCrop, { Crop as ReactCropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ReceiptScanResult {
  description: string;
  amount: number;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  date: string;
  category: string;
  expenseSource: 'scanned_receipt';
  receiptData?: any;
}

interface ReceiptScannerProps {
  baseCurrency?: string;
  onScanComplete: (data: ReceiptScanResult) => void;
  disabled?: boolean;
}

const ReceiptScanner = ({ baseCurrency = 'USD', onScanComplete, disabled }: ReceiptScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<ReactCropType>({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
  const [completedCrop, setCompletedCrop] = useState<ReactCropType | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Less aggressive resizing to preserve OCR quality
          const MAX_WIDTH = 2000;
          const MAX_HEIGHT = 2000;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Draw image WITHOUT grayscale - color helps OCR accuracy
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.92  // Higher quality for better OCR
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/xxx;base64, prefix for the API
        const base64 = result.split(',')[1];
        resolve(`data:${file.type};base64,${base64}`);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const scanReceipt = async (file: File) => {
    setIsScanning(true);

    try {
      console.log('Starting receipt scan...');
      
      // Compress image if needed (less aggressive threshold)
      let processedFile = file;
      if (file.size > 900 * 1024) { // Only compress if larger than 900KB
        console.log('Compressing image from', file.size, 'bytes');
        processedFile = await compressImage(file);
        console.log('Compressed to', processedFile.size, 'bytes');
      }
      
      const base64Image = await convertToBase64(processedFile);

      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: {
          imageData: base64Image,
          baseCurrency
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to scan receipt');
      }

      console.log('Receipt scan successful:', data.data);

      toast({
        title: "Receipt Scanned Successfully",
        description: `Found: ${data.data.description} - ${baseCurrency} ${data.data.amount.toFixed(2)}`,
      });

      // Clean up and reset state
      setScanPreview(null);
      setShowPreview(false);
      setShowCropper(false);
      setSelectedFile(null);
      
      // Pass the extracted data to the parent component
      onScanComplete(data.data);

    } catch (error) {
      console.error('Receipt scanning error:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan receipt. Please try again.",
        variant: "destructive",
      });
      setScanPreview(null);
    } finally {
      setIsScanning(false);
    }
  };

  const getCroppedFileFromElement = async (image: HTMLImageElement, crop: ReactCropType): Promise<File> => {
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    const cropX = crop.unit === '%' ? (crop.x! / 100) * naturalWidth : (crop.x || 0);
    const cropY = crop.unit === '%' ? (crop.y! / 100) * naturalHeight : (crop.y || 0);
    const cropW = crop.unit === '%' ? (crop.width! / 100) * naturalWidth : (crop.width || naturalWidth);
    const cropH = crop.unit === '%' ? (crop.height! / 100) * naturalHeight : (crop.height || naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW));
    canvas.height = Math.max(1, Math.round(cropH));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(
      image,
      Math.round(cropX),
      Math.round(cropY),
      Math.round(cropW),
      Math.round(cropH),
      0,
      0,
      Math.round(cropW),
      Math.round(cropH)
    );

    // Convert to grayscale to reduce size
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to create blob'));
          resolve(new File([blob], 'cropped-receipt.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleCropAndScan = async () => {
    if (!completedCrop || !imageRef.current) return;
    
    try {
      const croppedFile = await getCroppedFileFromElement(imageRef.current, completedCrop);
      setShowCropper(false);
      setShowPreview(false);
      await scanReceipt(croppedFile);
    } catch (error) {
      console.error('Cropping error:', error);
      toast({
        title: "Crop Failed",
        description: "Failed to crop image. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleDirectScan = async () => {
    if (!selectedFile) return;
    setShowPreview(false);
    await scanReceipt(selectedFile);
  };

  const handleRetake = () => {
    setScanPreview(null);
    setShowPreview(false);
    setShowCropper(false);
    setSelectedFile(null);
  };

  const handleStartCrop = () => {
    setShowPreview(false);
    setShowCropper(true);
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setShowPreview(true);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Show preview instead of scanning immediately
    setSelectedFile(file);
    setScanPreview(URL.createObjectURL(file));
    setShowPreview(true);
    setShowCropper(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {showCropper && scanPreview ? (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-lg font-medium">Crop Receipt</h3>
              <p className="text-sm text-muted-foreground">
                Adjust to focus on just the receipt
              </p>
            </div>
            
            <div className="relative w-full bg-muted rounded p-2">
              <ReactCrop crop={crop} onChange={setCrop} onComplete={(c) => setCompletedCrop(c)} keepSelection>
                <img ref={imageRef} src={scanPreview} alt="Crop source" className="max-h-72 mx-auto" />
              </ReactCrop>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleCancelCrop}
                disabled={isScanning}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              
              <Button
                onClick={handleCropAndScan}
                disabled={isScanning}
                className="flex items-center gap-2"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isScanning ? 'Scanning...' : 'Confirm & Scan'}
              </Button>
            </div>
          </div>
        ) : showPreview && scanPreview ? (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-lg font-medium">Review Photo</h3>
            </div>
            
            <div className="flex justify-center">
              <img 
                src={scanPreview} 
                alt="Receipt preview" 
                className="max-h-64 object-contain rounded border"
              />
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleRetake}
                disabled={isScanning}
                className="flex items-center gap-2"
                size="lg"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
              
              <Button
                variant="outline"
                onClick={handleStartCrop}
                disabled={isScanning}
                className="flex items-center gap-2"
                size="lg"
              >
                <Crop className="w-5 h-5" />
              </Button>
              
              <Button
                onClick={handleDirectScan}
                disabled={isScanning}
                className="flex items-center gap-2"
                size="lg"
              >
                {isScanning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              Trash: Retake • Crop: Adjust area • Check: Scan now
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Scan Receipt</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a receipt image to automatically extract expense details
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={openCamera}
                disabled={disabled || isScanning}
                className="flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Camera
              </Button>

              <Button
                variant="outline"
                onClick={openFileDialog}
                disabled={disabled || isScanning}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-xs text-muted-foreground text-center">
              Supported formats: JPEG, PNG, WebP • Max size: 10MB
              <br />
              Base currency: {baseCurrency}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptScanner;