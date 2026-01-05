"use client";

/**
 * Example page demonstrating ErrorState component usage
 * 
 * This page showcases all error types and variants for reference.
 * In production, you would use these components in actual error scenarios.
 */

import { useRouter } from "next/navigation";
import {
  ErrorState,
  NetworkErrorState,
  AuthorizationErrorState,
  ServerErrorState,
  NotFoundErrorState,
  EmptyStateError,
} from "@/components/shared/ErrorState";
import { ErrorVariant, ButtonVariant } from "@/lib/utils/client-enums";
import { AlertCircle, FileText, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ErrorExamplesPage() {
  const router = useRouter();

  const handleRetry = () => {
    console.log("Retry action triggered");
  };

  const handleGoHome = () => {
    router.push("/dashboard");
  };

  const handleSignIn = () => {
    router.push("/sign-in");
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleCreate = () => {
    console.log("Create action triggered");
  };

  return (
    <div className="space-y-12 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Error State Component Examples
        </h1>
        <p className="text-slate-600 mb-8">
          Production-ready error UI components for tax compliance and finance applications.
        </p>

        <div className="space-y-16">
          {/* Network Error */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Network Error (Pre-configured)
              </h2>
              <NetworkErrorState onRetry={handleRetry} onGoHome={handleGoHome} />
            </Card>
          </section>

          {/* Authorization Error */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Authorization Error (Pre-configured)
              </h2>
              <AuthorizationErrorState
                onSignIn={handleSignIn}
                onGoHome={handleGoHome}
              />
            </Card>
          </section>

          {/* Server Error */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Server Error (Pre-configured)
              </h2>
              <ServerErrorState onRetry={handleRetry} onGoHome={handleGoHome} />
            </Card>
          </section>

          {/* Not Found Error */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Not Found Error (Pre-configured)
              </h2>
              <NotFoundErrorState
                onGoBack={handleGoBack}
                onGoHome={handleGoHome}
              />
            </Card>
          </section>

          {/* Empty State */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Empty State (Pre-configured)
              </h2>
              <EmptyStateError
                title="No Invoices Yet"
                description="Start by creating your first invoice to track your company transactions."
                onCreate={handleCreate}
              />
            </Card>
          </section>

          {/* Custom Error - Payment Failed */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Custom Error - Payment Failed
              </h2>
              <ErrorState
                variant={ErrorVariant.Error}
                title="Payment Processing Failed"
                description="We couldn't process your payment. Please check your payment details and try again, or use a different payment method."
                icon={DollarSign}
                primaryAction={{
                  label: "Retry Payment",
                  onClick: handleRetry,
                  icon: AlertCircle,
                }}
                secondaryAction={{
                  label: "Contact Support",
                  onClick: () => router.push("/contact"),
                  variant: ButtonVariant.Outline,
                }}
              />
            </Card>
          </section>

          {/* Custom Warning - Tax Deadline */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Custom Warning - Tax Deadline Approaching
              </h2>
              <ErrorState
                variant={ErrorVariant.Warning}
                title="Tax Filing Deadline Approaching"
                description="Your VAT return is due in 3 days. Submit your return now to avoid penalties."
                icon={FileText}
                primaryAction={{
                  label: "File Return Now",
                  onClick: () => router.push("/dashboard/vat"),
                }}
                secondaryAction={{
                  label: "Remind Me Later",
                  onClick: () => console.log("Remind later"),
                  variant: ButtonVariant.Ghost,
                }}
              />
            </Card>
          </section>

          {/* Custom Empty - No Transactions */}
          <section>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Custom Empty State - No Transactions
              </h2>
              <ErrorState
                variant={ErrorVariant.Empty}
                title="No Transactions Found"
                description="You haven't recorded any transactions yet. Start tracking your company finances by creating your first transaction."
                icon={DollarSign}
                primaryAction={{
                  label: "Create Transaction",
                  onClick: handleCreate,
                }}
              />
            </Card>
          </section>
        </div>

        {/* Usage Instructions */}
        <div className="mt-16 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Usage Instructions
          </h2>
          <div className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold mb-2">1. Pre-configured Components</h3>
              <p className="text-sm">
                Use pre-configured components for common error types:
                <code className="block mt-2 p-2 bg-white rounded text-xs">
                  {`<NetworkErrorState onRetry={handleRetry} onGoHome={handleGoHome} />`}
                </code>
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Custom Error States</h3>
              <p className="text-sm">
                Use the base ErrorState component for custom scenarios:
                <code className="block mt-2 p-2 bg-white rounded text-xs">
                  {`<ErrorState
  variant="error"
  title="Custom Error"
  description="Error details"
  icon={AlertCircle}
  primaryAction={{ label: "Action", onClick: handler }}
/>`}
                </code>
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Error Utilities</h3>
              <p className="text-sm">
                Use error utilities to automatically determine error types:
                <code className="block mt-2 p-2 bg-white rounded text-xs">
                  {`import { createErrorStateProps } from "@/components/shared/ErrorState";
const errorProps = createErrorStateProps(error);
<ErrorState {...errorProps} primaryAction={...} />`}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

















