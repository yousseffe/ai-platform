import {
  getComparableModels,
  getComparisonHistory,
} from "@/lib/actions/model-comparisons.actions";
import ModelComparisonWorkspace from "@/components/compare/ModelComparisonWorkspace";

export default async function OrgCompareModelsPage() {
  const [models, history] = await Promise.all([
    getComparableModels({ sort: "popularity" }),
    getComparisonHistory(),
  ]);

  return (
    <ModelComparisonWorkspace
      title="Organization Model Comparison"
      description="Help your team benchmark public marketplace models side by side before choosing the best fit for latency, spend, and output quality."
      initialModels={models}
      initialHistory={history}
    />
  );
}
