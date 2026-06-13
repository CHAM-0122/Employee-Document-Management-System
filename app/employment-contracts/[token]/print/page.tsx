import { EmploymentContractPrintPage } from "@/src/components/employment-contract/employment-contract-print-page";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <EmploymentContractPrintPage token={token} />;
}
