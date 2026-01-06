/**
 * Fast Milk Verification Component
 * Ultra-responsive UI with real-time progress feedback
 * Optimized for speed with parallel processing and optimistic updates
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Camera,
    Upload,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
    Zap,
    Image as ImageIcon
} from 'lucide-react';
import { fastUploadAndVerify, UploadProgress } from '@/services/fast-upload-service';
import { cn } from '@/lib/utils';

interface FastMilkVerificationProps {
    farmerId: string;
    collectionId: string;
    recordedLiters: number;
    staffId?: string;
    onVerificationComplete?: (result: any) => void;
    onError?: (error: string) => void;
}

export const FastMilkVerification: React.FC<FastMilkVerificationProps> = ({
    farmerId,
    collectionId,
    recordedLiters,
    staffId,
    onVerificationComplete,
    onError,
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [result, setResult] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            onError?.('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            onError?.('Image size must be less than 10MB');
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadAndVerify = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setResult(null);

        try {
            const uploadResult = await fastUploadAndVerify(selectedFile, {
                farmerId,
                collectionId,
                recordedLiters,
                staffId,
                onProgress: (progressData) => {
                    setProgress(progressData);
                },
            });

            if (uploadResult.success) {
                setResult(uploadResult);
                onVerificationComplete?.(uploadResult);
            } else {
                onError?.(uploadResult.error || 'Verification failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStageIcon = () => {
        if (!progress) return <Upload className="h-5 w-5" />;

        switch (progress.stage) {
            case 'compressing':
                return <Zap className="h-5 w-5 animate-pulse text-blue-500" />;
            case 'uploading':
                return <Upload className="h-5 w-5 animate-bounce text-purple-500" />;
            case 'verifying':
                return <Loader2 className="h-5 w-5 animate-spin text-orange-500" />;
            case 'saving':
                return <Loader2 className="h-5 w-5 animate-spin text-green-500" />;
            case 'complete':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Upload className="h-5 w-5" />;
        }
    };

    const getStageColor = () => {
        if (!progress) return 'bg-gray-200';

        switch (progress.stage) {
            case 'compressing':
                return 'bg-blue-500';
            case 'uploading':
                return 'bg-purple-500';
            case 'verifying':
                return 'bg-orange-500';
            case 'saving':
                return 'bg-green-500';
            case 'complete':
                return 'bg-green-600';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-gray-200';
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setProgress(null);
        setResult(null);
        setIsProcessing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        AI Milk Verification
                    </span>
                    {result?.timings && (
                        <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            {(result.timings.total / 1000).toFixed(1)}s
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* File Input */}
                <div className="space-y-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="milk-photo-input"
                    />
                    <label
                        htmlFor="milk-photo-input"
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            previewUrl
                                ? "border-green-300 bg-green-50"
                                : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
                        )}
                    >
                        {previewUrl ? (
                            <div className="relative w-full h-full">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-contain rounded-lg"
                                />
                                <div className="absolute top-2 right-2">
                                    <Badge className="bg-green-500">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Ready
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                                <p className="mb-2 text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG, WEBP (max 10MB)</p>
                            </div>
                        )}
                    </label>
                </div>

                {/* Progress Bar */}
                {isProcessing && progress && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                {getStageIcon()}
                                <span className="font-medium">{progress.message}</span>
                            </span>
                            <span className="text-gray-500">{progress.progress.toFixed(0)}%</span>
                        </div>
                        <Progress
                            value={progress.progress}
                            className="h-2"
                        />
                    </div>
                )}

                {/* Verification Result */}
                {result?.verification && (
                    <div className={cn(
                        "p-4 rounded-lg border-2",
                        result.verification.verificationPassed
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                    )}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {result.verification.verificationPassed ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                )}
                                <span className={cn(
                                    "font-semibold",
                                    result.verification.verificationPassed ? "text-green-900" : "text-red-900"
                                )}>
                                    {result.verification.verificationPassed ? 'Verified' : 'Flagged for Review'}
                                </span>
                            </div>
                            <Badge variant="outline">
                                Confidence: {(result.verification.confidence * 100).toFixed(0)}%
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-white p-2 rounded">
                                <p className="text-xs text-gray-500">Recorded</p>
                                <p className="text-lg font-semibold">{recordedLiters}L</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                                <p className="text-xs text-gray-500">AI Estimated</p>
                                <p className="text-lg font-semibold">{result.verification.estimatedLiters}L</p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-700">
                            {result.verification.explanation}
                        </p>

                        {/* Performance Metrics */}
                        {result.timings && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-2">Performance Breakdown:</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500">Compression:</span>
                                        <span className="ml-1 font-medium">{result.timings.compression}ms</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Upload:</span>
                                        <span className="ml-1 font-medium">{result.timings.upload}ms</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">AI:</span>
                                        <span className="ml-1 font-medium">{result.timings.verification}ms</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {!result && (
                        <Button
                            onClick={handleUploadAndVerify}
                            disabled={!selectedFile || isProcessing}
                            className="flex-1"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Verify with AI
                                </>
                            )}
                        </Button>
                    )}
                    {result && (
                        <Button
                            onClick={resetForm}
                            variant="outline"
                            className="flex-1"
                        >
                            Verify Another
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default FastMilkVerification;
