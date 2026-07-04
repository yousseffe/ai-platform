import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminProviderDetailsResponse } from "@/types";
import { AdminUtilizationBar } from "@/components/admin/common/AdminUtilizationBar";

interface ProviderUtilizationPanelProps {
  /** Detailed provider payload. */
  provider: AdminProviderDetailsResponse;
}

/**
 * Utilization panel for provider tier limits.
 *
 * @param props - Component props.
 * @returns Utilization panel.
 */
export function ProviderUtilizationPanel({
  provider,
}: ProviderUtilizationPanelProps) {
  const rows = [
    ["Total Models", provider.utilization.totalModels],
    ["Public Models", provider.utilization.publicModels],
    ["LLM Models", provider.utilization.llmModels],
    ["Vision Models", provider.utilization.visionModels],
    ["NLP Models", provider.utilization.nlpModels],
    ["Tabular Models", provider.utilization.tabularModels],
    ["Diffusion Models", provider.utilization.diffusionModels],
    ["Audio Models", provider.utilization.audioModels],
    ["Embedding Models", provider.utilization.embeddingModels],
  ] as const;

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader>
        <CardTitle className="text-base">Utilization Panel</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {rows.map(([label, value]) =>
          value ? (
            <AdminUtilizationBar
              key={label}
              label={label}
              used={value.used}
              limit={value.limit}
            />
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}
