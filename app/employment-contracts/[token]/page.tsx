import { EmploymentContractRenewalPage } from "@/src/components/employment-contract/employment-contract-renewal-page";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <EmploymentContractRenewalPage token={token} />;
}
