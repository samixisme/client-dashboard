import React, { useState } from "react";
import { Invoice, Estimate, Client, UserSettings } from "../../../types";
import { InvoicePdfGenerator } from "../../utils/pdf/invoicePdfGenerator";
import { EstimatePdfGenerator } from "../../utils/pdf/estimatePdfGenerator";
import { toast } from "sonner";

export type DocumentDownloadButtonProps =
  | {
      type: "invoice";
      document: Invoice;
      client: Client;
      userSettings: UserSettings;
      variant?: "primary" | "secondary";
    }
  | {
      type: "estimate";
      document: Estimate;
      client: Client;
      userSettings: UserSettings;
      variant?: "primary" | "secondary";
    };

export const DocumentDownloadButton: React.FC<DocumentDownloadButtonProps> = ({
  type,
  document,
  client,
  userSettings,
  variant = "primary",
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      if (type === "invoice") {
        await InvoicePdfGenerator.generateInvoicePdf(
          document as Invoice,
          client,
          userSettings,
        );
        toast.success("Invoice PDF downloaded");
      } else {
        await EstimatePdfGenerator.generateEstimatePdf(
          document as Estimate,
          client,
          userSettings,
        );
        toast.success("Estimate PDF downloaded");
      }
    } catch (error) {
      console.error(`Failed to generate ${type} PDF:`, error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const buttonClasses =
    variant === "primary"
      ? "px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      : "p-2 text-text-secondary hover:text-primary bg-glass/40 hover:bg-glass/60 rounded-lg transition-all duration-300 border border-border-color cursor-pointer hover:scale-110 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={buttonClasses}
      title={isGenerating ? "Generating..." : "Download"}
      aria-label={`Download ${type}`}
      aria-busy={isGenerating}
    >
      {variant === "secondary" ? (
        isGenerating ? (
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )
      ) : isGenerating ? (
        "Generating..."
      ) : (
        "Download"
      )}
    </button>
  );
};
