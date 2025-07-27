import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    setScanPreview(URL.createObjectURL(file));

    try {
      console.log('Starting receipt scan...');
      const base64Image = await convertToBase64(file);

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

      // Clean up preview
      setScanPreview(null);
      
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

    await scanReceipt(file);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    // For now, open file dialog - in future could implement camera capture
    toast({
      title: "Camera Feature",
      description: "Camera capture coming soon! Please use file upload for now.",
    });
    openFileDialog();
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Scan Receipt</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a receipt image to automatically extract expense details
            </p>
          </div>

          {scanPreview && (
            <div className="flex justify-center mb-4">
              <img 
                src={scanPreview} 
                alt="Receipt preview" 
                className="max-w-32 max-h-32 object-contain rounded border"
              />
            </div>
          )}

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
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isScanning ? 'Scanning...' : 'Upload'}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="text-xs text-muted-foreground text-center">
            Supported formats: JPEG, PNG, WebP • Max size: 10MB
            <br />
            Base currency: {baseCurrency}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptScanner;