import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Brand, BrandLogo } from '../types';
import Stepper from '../components/ai/Stepper';
import { GoogleGenAI, Modality } from '@google/genai';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { RedoIcon } from '../components/icons/RedoIcon';

type MediumOption = { name: string; description: string; };
type FormatOption = { name: string; description: string; aspectRatioText: string; };
type MediumCategory = {
    name: string;
    mediums: MediumOption[];
};

const mediumCategories: MediumCategory[] = [
    {
        name: 'Apparel',
        mediums: [
            { name: 'On a T-Shirt', description: 'Classic cotton crewneck t-shirt.' },
            { name: 'On a Hoodie', description: 'Cozy pullover hoodie.' },
            { name: 'On a Baseball Cap', description: 'Embroidered logo on a cap.' },
            { name: 'On a Beanie', description: 'Woven label on a winter beanie.' },
            { name: 'On a Tote Bag', description: 'Screen-printed on a canvas tote bag.' },
        ],
    },
    {
        name: 'Print & Stationery',
        mediums: [
            { name: 'On a Business Card', description: 'Elegant, high-quality card stock.' },
            { name: 'As a Letterhead', description: 'At the top of an A4 document.' },
            { name: 'On a Poster', description: 'Large promotional poster for an event.' },
            { name: 'On a Flyer', description: 'Standard A5 marketing flyer.' },
            { name: 'On a Book Cover', description: 'Hardcover book jacket.' },
        ],
    },
    {
        name: 'Products & Packaging',
        mediums: [
            { name: 'On a Coffee Mug', description: 'Printed on a ceramic mug.' },
            { name: 'On a Water Bottle', description: 'Stainless steel reusable bottle.' },
            { name: 'On a Product Box', description: 'Modern cardboard packaging.' },
            { name: 'On a Shopping Bag', description: 'Luxury paper retail bag.' },
            { name: 'On a Phone Case', description: 'Sleek smartphone case.' },
        ],
    },
    {
        name: 'Digital & UI',
        mediums: [
            { name: 'As an App Icon', description: 'Displayed on a smartphone screen.' },
            { name: 'On a Website Header', description: 'Featured on a company homepage.' },
            { name: 'As a Social Media Profile', description: 'Profile picture for a social account.' },
            { name: 'In an Email Signature', description: 'At the bottom of a professional email.' },
            { name: 'On a Digital Ad Banner', description: 'Online advertising banner.' },
        ],
    },
    {
        name: 'Environments & Signage',
        mediums: [
            { name: 'On a Building Facade', description: 'Signage on a modern office building.' },
            { name: 'As a Storefront Sign', description: 'Neon or 3D sign on a shop.' },
            { name: 'On a Billboard', description: 'Large outdoor advertising billboard.' },
            { name: 'On a Reception Wall', description: 'Logo behind a reception desk.' },
            { name: 'On a Cafe Window', description: 'Vinyl decal on a glass window.' },
        ],
    },
    {
        name: 'Vehicles',
        mediums: [
            { name: 'On a Delivery Truck', description: 'On the side of a white cargo truck.' },
            { name: 'On a Company Car', description: 'Vinyl wrap on a modern sedan.' },
            { name: 'On a Scooter', description: 'Side of a delivery scooter.' },
        ],
    },
    {
        name: 'Unique Items',
        mediums: [
            { name: 'On a Skateboard Deck', description: 'Graphic on the bottom of a skateboard.' },
            { name: 'On a Laptop Sticker', description: 'Vinyl sticker on a laptop lid.' },
            { name: 'As a Tattoo', description: 'Artistic temporary tattoo.' },
        ],
    },
];

const formatOptions: FormatOption[] = [
    { name: 'Social Media Post', description: 'a square 1:1 aspect ratio, perfect for Instagram.', aspectRatioText: '1:1' },
    { name: 'Billboard / Banner', description: 'a wide 16:9 landscape format for advertising.', aspectRatioText: '16:9' },
    { name: 'Poster / Flyer', description: 'a 4:3 portrait format for print or digital posters.', aspectRatioText: '4:3' },
];

const GENERATION_COST = 5;

// Helper to fetch an image (including SVG) and convert it to a base64 PNG string using a canvas.
async function urlToPngBase64(url: string): Promise<{ base64Data: string; mimeType: 'image/png' }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Attempt to handle CORS
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(img, 0, 0);
            try {
                const dataUrl = canvas.toDataURL('image/png');
                const base64String = dataUrl.split(',')[1];
                resolve({ base64Data: base64String, mimeType: 'image/png' });
            } catch (e) {
                reject(new Error(`Could not convert canvas to data URL. Error: ${e}`));
            }
        };
        img.onerror = () => {
            reject(new Error('Failed to load image from URL. This may be due to CORS restrictions on the image server.'));
        };
        img.src = url;
    });
}


const BrandAssetCreatorPage = () => {
    const { data } = useData();
    const { brands } = data;

    const [step, setStep] = useState(1);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [selectedLogo, setSelectedLogo] = useState<BrandLogo | null>(null);
    const [selectedMedium, setSelectedMedium] = useState<MediumOption | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [credits, setCredits] = useState(100);

    const steps = [{ name: 'Select Logo' }, { name: 'Choose Medium' }, { name: 'Finalize & Generate' }];

    const handleBrandSelect = (brand: Brand) => {
        setSelectedBrand(brand);
        setSelectedLogo(null);
    }

    const handleLogoSelect = (logo: BrandLogo) => {
        setSelectedLogo(logo);
    }

    const handleNextStep = () => {
        if (step < 3) {
            setStep(s => s + 1);
        }
    }
    
    const handleBackStep = () => {
        if (step > 1) {
            setStep(s => s + 1);
        }
    }
    
    const handleStartOver = () => {
        setStep(1);
        setSelectedBrand(null);
        setSelectedLogo(null);
        setSelectedMedium(null);
        setSelectedFormat(null);
        setGeneratedImage(null);
        setError(null);
        setIsGenerating(false);
    }

    const handleGenerate = async () => {
        if (!selectedBrand || !selectedLogo || !selectedMedium || !selectedFormat) {
            setError("Please complete all selections.");
            return;
        }

        if (credits < GENERATION_COST) {
            setError("Not enough credits to generate.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setCredits(c => c - GENERATION_COST);

        try {
            const logoUrl = selectedLogo.formats[0]?.url;
            if (!logoUrl) {
                throw new Error("Selected logo has no image URL.");
            }
            const { base64Data, mimeType } = await urlToPngBase64(logoUrl);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const prompt = `Using the provided logo image, create a high-quality, photorealistic mockup of it on a ${selectedMedium.name}. The scene should be professional, clean, and well-lit. The final image should have ${selectedFormat.description}.`;
            
            const imagePart = {
                inlineData: { data: base64Data, mimeType },
            };
            const textPart = { text: prompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            let generatedImageBase64 = '';
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    generatedImageBase64 = part.inlineData.data;
                    break;
                }
            }

            if (generatedImageBase64) {
                const imageUrl = `data:image/png;base64,${generatedImageBase64}`;
                setGeneratedImage(imageUrl);
            } else {
                throw new Error("The model did not return an image. Please try again.");
            }

        } catch (e: unknown) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            setError(`Failed to generate image: ${errorMessage}.`);
            setCredits(c => c + GENERATION_COST); // Refund credits on failure
        } finally {
            setIsGenerating(false);
        }
    };

    const SelectionCard = ({ title, imageUrl, isSelected, onClick }: { title: string, imageUrl: string, isSelected: boolean, onClick: () => void }) => (
        <button onClick={onClick} className={`bg-glass rounded-lg border-2 text-left overflow-hidden transition-all duration-200 ${isSelected ? 'border-primary shadow-lg' : 'border-border-color hover:border-primary/50'}`}>
            <img src={imageUrl} alt={title} className="w-full h-32 object-cover" />
            <div className="p-3">
                <p className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-text-primary'}`}>{title}</p>
            </div>
        </button>
    );

    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-2xl font-bold text-text-primary">Generating your image...</h2>
                <p className="text-text-secondary mt-2">This can take a moment.</p>
            </div>
        )
    }
    
    if (generatedImage) {
         return (
            <div className="text-center">
                 <h1 className="text-3xl font-bold text-text-primary">Your Asset is Ready!</h1>
                 <div className="mt-8 max-w-4xl mx-auto">
                    <img src={generatedImage} alt="Generated brand asset" className="rounded-lg shadow-2xl border border-border-color" />
                 </div>
                 <div className="mt-8 flex items-center justify-center gap-4">
                     <a href={generatedImage} download="brand-asset.png" className="px-6 py-3 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2">
                         <DownloadIcon className="h-5 w-5"/> Download
                    </a>
                     <button onClick={handleStartOver} className="px-6 py-3 bg-glass text-text-primary text-sm font-medium rounded-lg hover:bg-glass-light flex items-center gap-2">
                         <RedoIcon className="h-5 w-5 -scale-x-100"/> Start Over
                    </button>
                 </div>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-12">
                <h1 className="text-3xl font-bold text-text-primary text-center">Brand Asset Creator</h1>
                <p className="mt-2 text-text-secondary text-center">Generate stunning mockups of your brand assets in just 3 steps.</p>
            </div>

            <div className="max-w-3xl mx-auto mb-16">
                 <Stepper steps={steps} currentStep={step} />
            </div>

            {/* Step 1: Select Brand & Logo */}
            {step === 1 && (
                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-2">1. Select a Brand</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {brands.map(brand => (
                            <button key={brand.id} onClick={() => handleBrandSelect(brand)} className={`p-4 bg-glass rounded-lg border-2 transition-colors ${selectedBrand?.id === brand.id ? 'border-primary' : 'border-border-color hover:border-primary/50'}`}>
                                <h3 className="font-bold text-text-primary">{brand.name}</h3>
                            </button>
                        ))}
                    </div>

                    {selectedBrand && (
                        <>
                           <h2 className="text-xl font-semibold text-text-primary mb-2">2. Select a Logo from <span className="text-primary">{selectedBrand.name}</span></h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {selectedBrand.logos.map((logo, index) => (
                                    <SelectionCard
                                        // FIX: Spreading props to resolve a type error where 'key' was incorrectly treated as a prop.
                                        {...{
                                            key: `${logo.type}-${logo.variation}-${index}`,
                                            title: `${logo.type} (${logo.variation})`,
                                            imageUrl: logo.formats[0]?.url || '',
                                            isSelected: selectedLogo === logo,
                                            onClick: () => handleLogoSelect(logo),
                                        }}
                                    />
                                ))}
                           </div>
                        </>
                    )}
                </div>
            )}
            
            {/* Step 2: Choose Medium */}
            {step === 2 && (
                 <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Choose a Medium</h2>
                     <div className="space-y-8">
                        {mediumCategories.map(category => (
                            <div key={category.name}>
                                <h3 className="text-lg font-medium text-text-secondary mb-3">{category.name}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {category.mediums.map(medium => (
                                       <button key={medium.name} onClick={() => setSelectedMedium(medium)} className={`p-4 bg-glass rounded-lg border-2 text-left transition-colors h-full flex flex-col justify-center ${selectedMedium?.name === medium.name ? 'border-primary shadow-lg' : 'border-border-color hover:border-primary/50'}`}>
                                            <p className={`font-semibold text-sm ${selectedMedium?.name === medium.name ? 'text-primary' : 'text-text-primary'}`}>{medium.name}</p>
                                            <p className="text-xs text-text-secondary mt-1">{medium.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            )}

            {/* Step 3: Finalize & Generate */}
            {step === 3 && (
                 <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Choose a Format</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {formatOptions.map(format => (
                             <button key={format.name} onClick={() => setSelectedFormat(format)} className={`p-4 bg-glass rounded-lg border-2 text-left transition-colors ${selectedFormat?.name === format.name ? 'border-primary' : 'border-border-color hover:border-primary/50'}`}>
                                <h3 className={`font-bold ${selectedFormat?.name === format.name ? 'text-primary' : 'text-text-primary'}`}>{format.name}</h3>
                                <p className="text-xs text-text-secondary mt-1">{format.description}</p>
                            </button>
                        ))}
                    </div>

                    <div className="bg-glass p-6 rounded-lg border border-border-color">
                        <h3 className="font-semibold text-text-primary mb-4">Summary</h3>
                        <div className="space-y-2 text-sm text-text-secondary">
                           <p><strong>Logo:</strong> {selectedBrand?.name} - {selectedLogo?.type} ({selectedLogo?.variation})</p>
                           <p><strong>Medium:</strong> {selectedMedium?.name}</p>
                           <p><strong>Format:</strong> {selectedFormat?.name}</p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-border-color flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-text-primary">Available Credits: {credits}</p>
                                <p className="text-sm text-text-secondary">Generation Cost: {GENERATION_COST} Credits</p>
                            </div>
                            <button onClick={handleGenerate} disabled={!selectedFormat || credits < GENERATION_COST} className="px-6 py-3 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover disabled:bg-gray-500 disabled:cursor-not-allowed">
                                Generate Image
                            </button>
                        </div>
                         {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                    </div>
                 </div>
            )}


            {/* Navigation */}
            <div className="mt-12 flex justify-between items-center">
                <button onClick={handleBackStep} disabled={step === 1} className="px-4 py-2 bg-glass text-text-primary text-sm font-medium rounded-lg hover:bg-glass-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <ArrowLeftIcon className="h-4 w-4"/> Back
                </button>
                <button onClick={handleNextStep} disabled={step === 3 || (step === 1 && !selectedLogo) || (step === 2 && !selectedMedium) } className="px-6 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover disabled:bg-gray-500 disabled:cursor-not-allowed">
                    Next
                </button>
            </div>
        </div>
    )
};

export default BrandAssetCreatorPage;