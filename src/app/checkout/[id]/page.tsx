import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>
      }
    >
      <CheckoutClient reservationId={id} />
    </Suspense>
  );
}
