import { IntakeWizard } from "@/src/components/intake/intake-wizard";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <IntakeWizard token={token} />;
}

